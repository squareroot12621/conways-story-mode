class CGoL {
  #ctx
  #last_draw_time
  #last_animation_frame
  #cached_picture
  
  constructor(options={}) {
    // CGoL stuff
    this.grid_size = options.grid_size ?? 64
    this.border = options.border ?? 8
    if (this.border >= this.grid_size / 2) {
      this.border = Math.floor((this.grid_size-1) / 2)
    }
    this.intermediate_rle = options.pattern ?? '.'
    var parsed = CGoL.parse_rle(this.intermediate_rle)
    this.rule = options.rule ?? parsed.rule ?? 'B3/S23'
    this.pattern = parsed.pattern
    this.pattern_x = options.pattern_x ?? 0
    this.pattern_x += Math.floor((this.grid_size - parsed.width) / 2)
    this.pattern_y = options.pattern_y ?? 0
    this.pattern_y += Math.floor((this.grid_size - parsed.height) / 2)
    this.pattern_width = parsed.width
    this.pattern_height = parsed.height
    this.objects = []
    for (var object of options.objects ?? []) {
      var parsed_object = CGoL.parse_rle(object.pattern)
      this.objects.push({
        pattern: parsed_object.pattern,
        x: (object.x ?? 0) + this.pattern_x,
        y: (object.y ?? 0) + this.pattern_y,
        width: parsed_object.width,
        height: parsed_object.height,
        rotation: object.rotation ?? 0, // 0 = upright, 1 = 90 degrees CW
        flip_x: object.flip_x ?? false,
      })
    }
    this.#compile_pattern()
    // Graphical stuff
    this.canvas = options.canvas
    this.#ctx = options.canvas.getContext('2d')
    this.x_offset = options.x_offset ?? 0
    this.y_offset = options.y_offset ?? 0
    this.zoom = options.zoom ?? 8

    this.#last_draw_time = -Infinity
    this.#last_animation_frame = null
    this.#cached_picture = null
  }

  static #normalize_rule(rule) {
    rule = rule.toUpperCase()
    var rule_match = rule.match(/^B?([0-8]*)(?:\/|S|\/S)([0-8]*)(?:(?:\/|G|\/G)(\d+))?$/)
    if (rule_match) {
      // Either a B.../S.../G... rule or a .../.../... rule
      var [birth, survival, generations] = rule_match.slice(1, 4)
      if (!(rule.includes('B') || rule.includes('S'))) {
        [survival, birth] = [birth, survival]
      }
      if (birth.includes('0')) {
        throw Error("B0 rules aren't supported yet")
      }
      if (generations) {
        throw Error("Generations rules aren't supported yet")
      }
      return generations > 2 ? `B${birth}/S${survival}/G${generations}` : `B${birth}/S${survival}`
    } else {
      // Named rule
      switch (rule) {
        case 'H-TREES':                  rule = 'B1/S012345678'; break;
        case 'FUZZ':                     rule = 'B1/S014567'; break;
        case 'GNARL':                    rule = 'B1/S1'; break;
        case 'SNAKESKIN':                rule = 'B1/S134567'; break;
        case 'SOLID ISLANDS GROW AMONGST STATIC': rule = 'B12678/S15678'; break;
        case 'REPLICATOR':               rule = 'B1357/S1357'; break;
        case 'FREDKIN':                  rule = 'B1357/S02468'; break;
        case 'FEUX':                     rule = 'B1358/S0247'; break;
        case 'SEEDS':                    rule = 'B2/S'; break;
        case 'LIVE FREE OR DIE':         rule = 'B2/S0'; break;
        case 'SERVIETTES':               rule = 'B234/S'; break;
        case 'ICEBALLS':                 rule = 'B25678/S5678'; break;
        case 'LIFE WITHOUT DEATH':       rule = 'B3/S012345678'; break;
        case 'DOTLIFE':                  rule = 'B3/S023'; break;
        case 'STAR TREK':                rule = 'B3/S0248'; break;
        case 'FLOCK':                    rule = 'B3/S12'; break;
        case 'MAZECTRIC':                rule = 'B3/S1234'; break;
        case 'MAZE':                     rule = 'B3/S12345'; break;
        case 'MAGNEZONES':               rule = 'B3/S123678'; break;
        case 'SNOWLIFE':                 rule = 'B3/S1237'; break;
        case 'CORROSION OF CONFORMITY':  rule = 'B3/S124'; break;
        case 'EIGHTFLOCK':               rule = 'B3/S128'; break;
        case 'LOWLIFE':                  rule = 'B3/S13'; break;
        case 'LIFE':                     rule = 'B3/S23'; break;
        case "CONWAY'S LIFE":            rule = 'B3/S23'; break;
        case "CONWAY'S GAME OF LIFE":    rule = 'B3/S23'; break;
        case 'EIGHTLIFE':                rule = 'B3/S238'; break;
        case 'SHOOTS AND ROOTS':         rule = 'B3/S245678'; break;
        case 'LIFEGUARD 2':              rule = 'B3/S4567'; break;
        case 'CORAL':                    rule = 'B3/S45678'; break;
        case '34 LIFE':                  rule = 'B34/S34'; break;
        case '3-4 LIFE':                 rule = 'B34/S34'; break;
        case 'DANCE':                    rule = 'B34/S35'; break;
        case 'BACTERIA':                 rule = 'B34/S456'; break;
        case 'NEVER HAPPY':              rule = 'B345/S0456'; break;
        case 'BLINKERS':                 rule = 'B345/S2'; break;
        case 'ASSIMILATION':             rule = 'B345/S4567'; break;
        case 'LONG LIFE':                rule = 'B345/S5'; break;
        case 'SPIRAL AND POLYGONAL GROWTH': rule = 'B34568/S15678'; break;
        case 'GEMS':                     rule = 'B3457/S4568'; break;
        case 'GEMS MINOR':               rule = 'B34578/S456'; break;
        case 'GROUNDED LIFE':            rule = 'B35/S23'; break;
        case 'LAND RUSH':                rule = 'B35/S234578'; break;
        case 'BUGS':                     rule = 'B3567/S15678'; break;
        case 'CHEERIOS':                 rule = 'B35678/S34567'; break;
        case 'HOLSTEIN':                 rule = 'B35678/S4678'; break;
        case 'DIAMOEBA':                 rule = 'B35678/S5678'; break;
        case 'AMOEBA':                   rule = 'B357/S1358'; break;
        case 'PSEUDO LIFE':              rule = 'B357/S238'; break;
        case 'GEOLOGY':                  rule = 'B3578/S24678'; break;
        case 'HIGHFLOCK':                rule = 'B36/S12'; break;
        case '2x2':                      rule = 'B36/S125'; break;
        case '2\u00D72':                 rule = 'B36/S125'; break;
        case 'IRONFLOCK':                rule = 'B36/S128'; break;
        case 'HIGHLIFE':                 rule = 'B36/S23'; break;
        case 'LAND RUSH 2':              rule = 'B36/S234578'; break;
        case 'VIRUS':                    rule = 'B36/S235'; break;
        case 'IRONLIFE':                 rule = 'B36/S238'; break;
        case 'SQRT REPLICATOR RULE':     rule = 'B36/S245'; break;
        case 'SLOW BLOB':                rule = 'B367/S125678'; break;
        case 'DRIGHLIFE':                rule = 'B367/S23'; break;
        case '2x2 2':                    rule = 'B3678/S1258'; break;
        case '2\u00D72 2':               rule = 'B3678/S1258'; break;
        case 'CASTLES':                  rule = 'B3678/S135678'; break;
        case 'STAINS':                   rule = 'B3678/S235678'; break;
        case 'DAY & NIGHT':              rule = 'B3678/S34678'; break;
        case 'LOWFLOCKDEATH':            rule = 'B368/S128'; break;
        case 'LIFE SKYHIGH':             rule = 'B368/S236'; break;
        case 'LOWDEATH':                 rule = 'B368/S238'; break;
        case 'MORLEY':                   rule = 'B368/S245'; break;
        case 'DRYLIFE WITHOUT DEATH':    rule = 'B37/S012345678'; break;
        case 'DRYFLOCK':                 rule = 'B37/S12'; break;
        case 'MAZECTRIC WITH MICE':      rule = 'B37/S1234'; break;
        case 'MAZE WITH MICE':           rule = 'B37/S12345'; break;
        case 'DRYLIFE':                  rule = 'B37/S23'; break;
        case 'PLOW WORLD':               rule = 'B378/S012345678'; break;
        case 'COAGULATIONS':             rule = 'B378/S235678'; break;
        case 'PEDESTRIAN LIFE WITHOUT DEATH': rule = 'B38/S012345678'; break;
        case 'PEDESTRIAN FLOCK':         rule = 'B38/S12'; break;
        case 'HONEYFLOCK':               rule = 'B38/S128'; break;
        case 'PEDESTRIAN LIFE':          rule = 'B38/S23'; break;
        case 'HONEYLIFE':                rule = 'B38/S238'; break;
        case 'ELECTRIFIED MAZE':         rule = 'B45/S12345'; break;
        case 'OSCILLATORS RULE':         rule = 'B45/S1235'; break;
        case 'WALLED CITIES':            rule = 'B45678/S2345'; break;
        case 'MAJORITY':                 rule = 'B45678/S5678'; break;
        case 'VOTE 4/5':                 rule = 'B4678/S35678'; break;
        case 'LIFEGUARD 1':              rule = 'B48/S234'; break;
        case "RINGS 'N' SLUGS":          rule = 'B56/S14568'; break;
        case 'VOTE':                     rule = 'B5678/S45678'; break;
        default:
          var rule_match = rule.match(/^[A-Za-z][A-Za-z0-9_\-]*$/)
          if (rule_match) {
            throw Error(`Unknown rule name ${rule}`)
          }
          throw SyntaxError(`Invalid rule name ${rule}`)
      }
      return rule
    }
  }
  
  static parse_rle(rle) {
    var output = {rule: null}
    var lines = []
    for (var line of rle.split('\n')) {
      var [line, comment] = line.trim().split('#', 1)
      // TODO: Don't ignore #P or #R
      if (comment?.startsWith('r')) {
        output.rule = CGoL.#normalize_rule(comment.slice(1).trim())
      }
      lines.push(line)
    }
    // Parse the header
    const header_regexp = RegExp('^x *= *(?:0|[1-9][0-9]*) *(?:, *)?' // x = ...
                                 + 'y *= *(?:0|[1-9][0-9]*) *(?:, *)?' // y = ...
                                 + '(?:rule *= *(.*))?$') // rule = ...
    var header_match = lines[0].match(header_regexp)
    if (header_match) {
      output.rule = CGoL.#normalize_rule(header_match[1])
      lines.shift()
    }
    // Decode the RLE
    var grid = []
    var current_line = []
    var row_width = 0
    var max_row_width = 0
    parse_rle_loop: for (var line of lines) {
      var processing_line = line
      while (processing_line) {
        var part = processing_line.match(/([1-9][0-9]*)?([.boA-Y$!])/)
        if (!part) {
          throw SyntaxError(`Invalid RLE ${processing_line}`)
        } else if (part.index) {
          throw SyntaxError(`Invalid RLE ${processing_line.slice(0, part.index)}`)
        }
        var count = parseInt(part[1]) || 1 // No count gets turned into 1
        var cell = part[2]
        var cell_number
        if (cell === '$') {
          grid.push(current_line)
          grid = grid.concat(Array(count - 1).fill([]))
          max_row_width = Math.max(row_width, max_row_width)
          current_line = []
          row_width = 0
        } else if (cell === '!') {
          break parse_rle_loop // No more RLE
        } else {
          switch (cell) {
            case '.':
            case 'b':
              cell_number = 0
              break
            case 'o':
              cell_number = 1
              break
            case /[A-Y]/.test(cell):
              cell_number = cell.codePointAt(0) - 64
              break
            default:
              throw SyntaxError(`Unknown cell ${cell}`)
          }
          current_line = current_line.concat(Array(count).fill(cell_number))
          row_width += count
        }
        processing_line = processing_line.slice(part[0].length)
      }
    }
    // Push the last line because it doesn't end in a $
    grid.push(current_line)
    grid = grid.concat(Array(count - 1).fill([]))
    max_row_width = Math.max(row_width, max_row_width)
    // Pad the rows with zeroes
    for (var [index, row] of grid.entries()) {
      grid[index] = row.concat(Array(max_row_width - row.length).fill(0))
    }
    output.pattern = grid
    output.width = max_row_width
    output.height = grid.length
    return output
  }

  #compile_pattern() {
    this.board = Array(this.grid_size * this.grid_size).fill(0)
    this.cell_types = Array(this.grid_size * this.grid_size).fill(0)
    /* Cell types:
       0 = normal
       1 = delete
       2 = create
       3 = important
       4 = unchangeable
       5 = connecting N
       6 = connecting NE
       7 = connecting E
       8 = connecting SE
       9 = connecting S
       10 = connecting SW
       11 = connecting W
       12 = connecting NW */
    for (var y = 0; y < this.pattern_height; ++y) {
      for (var x = 0; x < this.pattern_width; ++x) {
        var cell = this.pattern[y][x]
        var board_position = (y+this.pattern_y) * this.grid_size + (x+this.pattern_x)
        this.board[board_position] = cell % 2
        this.cell_types[board_position] = Math.floor(cell / 2)
      }
    }
    for (var object of this.objects) {
      // TODO: Add flip_x and rotation
      for (var y = 0; y < object.height; ++y) {
        for (var x = 0; x < object.width; ++x) {
          var cell = object[y][x]
          var board_position = (y+object.y) * this.grid_size + (x+object.x)
          this.board[board_position] = cell % 2
          this.cell_types[board_position] = Math.floor(cell / 2)
        }
      }
    }
  }
  
  move_to(x, y, zoom) {
    this.x_offset = x
    this.y_offset = y
    this.zoom = zoom
  }

  draw(options={}, timestamp) {
    if (timestamp === null || timestamp === undefined) {
      this.#draw_inner(options)
    } else {
      if (timestamp - this.#last_draw_time >= 1000) {
        this.#draw_inner(options)
        this.#last_draw_time = timestamp
        // TODO: Make the cache interval changeable using the speed slider
      } else {
        this.#ctx.putImageData(this.#cached_picture, 0, 0)
      }
      this.#last_animation_frame = requestAnimationFrame((t) => draw(options, timestamp))
      if (timestamp - this.#last_draw_time >= 1000) { // TEST --------------------
        this.#ctx.fillStyle = 'white'
        this.#ctx.font = '20px sans-serif'
        var last_animation_frame = this.#last_animation_frame?.toString() ?? ''
        this.#ctx.fillText(last_animation_frame, 50, 50)
      } // END TEST --------------------------------------------------------------
    }
    // TODO: Make every new frame add 1 to a visible counter on the canvas
  }

  stop_drawing() {
    cancelAnimationFrame(this.#last_animation_frame)
  }
  
  #draw_inner(options={}) {
    var ctx = this.#ctx
    var canvas = this.canvas
    var grid_size = this.grid_size
    var cell_size = this.zoom
    var true_x_offset = this.x_offset + (grid_size*cell_size - canvas.width) / 2
    var true_y_offset = this.y_offset + (grid_size*cell_size - canvas.height) / 2
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    var x, y
    for (var i = 0; i < grid_size; ++i) {
      for (var j = 0; j < grid_size; ++j) {
        var cell = this.board[i*grid_size + j]
        if (!cell) {
          continue
        }
        ctx.fillStyle = 'white'
        var left_x = j * cell_size | 0
        var right_x = (j + 1) * cell_size | 0
        var width = right_x - left_x
        var top_y = i * cell_size | 0
        var bottom_y = (i + 1) * cell_size | 0
        var height = bottom_y - top_y
        ctx.fillRect(left_x - true_x_offset, top_y - true_y_offset, width, height)
      }
    }
    // TODO: Gridlines
    // TODO: Different cell colors
    // TODO: Colorblind symbols
    this.#cached_picture = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
}

export {CGoL}
