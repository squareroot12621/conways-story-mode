import {images} from './utilities.js'

class CGoL {
  #last_tick_time
  #ctx
  #grid_canvas
  #grid_ctx
  #last_draw_time
  #last_width
  #last_height
  #last_animation_frame
  #changed_camera
  #changed_pattern
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
    this.compile_pattern()

    // Simulation stuff
    this.generation = 0
    this.playing = options.autoplay ?? false
    this.speed = options.speed ?? 5
    this.#last_tick_time = performance.now()
    
    // Graphical stuff
    this.canvas = options.canvas
    this.#ctx = options.canvas.getContext('2d')
    this.x_offset = options.x_offset ?? 0
    this.y_offset = options.y_offset ?? 0
    this.zoom = CGoL.#round_zoom(options.zoom ?? 8)

    // Offscreen canvas for drawing the grid
    var grid_canvas_size = CGoL.#grid_canvas_size(this.zoom)
    this.#grid_canvas = new OffscreenCanvas(grid_canvas_size, grid_canvas_size)
    this.#grid_ctx = this.#grid_canvas.getContext('2d')

    // Cache stuff
    this.#last_width = this.canvas.width
    this.#last_height = this.canvas.height
    this.#last_draw_time = -Infinity
    this.#last_animation_frame = null
    this.#changed_camera = false
    this.#changed_pattern = false
    this.#cached_picture = null
    /* Make sure the canvas doesn't keep requesting animation frames after it's destroyed
       https://stackoverflow.com/questions/20156453/how-to-detect-element-being-added-removed-from-dom-element */
    const observer = new MutationObserver(() => {
      if (!this.canvas.isConnected) {
        observer.disconnect()
        this.stop_drawing()
      }
    })
    observer.observe(
      document.getElementById('conways-story-mode'),
      {childList: true, subtree: true},
    )
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
            default:
              cell_number = cell.codePointAt(0) - 64
              break
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

  compile_pattern() {
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
    this.original_board = [...this.board]
  }

  step_forward() {
    ++this.generation
    this.#changed_pattern = true
    this.board = this.board.map((current_cell, index, old_board) => {
      var x = index % this.grid_size
      var y = index / this.grid_size | 0
      var neighbors = 0
      for (var [dx, dy] of [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ]) {
        var cx = x + dx
        var cy = y + dy
        if (cx >= 0 && cx < this.grid_size
            && cy >= 0 && cy < this.grid_size) {
          neighbors += old_board[cy*this.grid_size + cx]
        }
      }
      if ((current_cell && neighbors == 2) || neighbors == 3) {
        return 1
      } else {
        return 0
      }
    })
  }

  play() {
    this.playing = true
    this.#last_tick_time = performance.now()
  }

  pause() {
    this.playing = false
  }
  
  move_to(x, y, zoom) {
    this.x_offset = x
    this.y_offset = y
    this.zoom = CGoL.#round_zoom(zoom)
    this.#changed_camera = true
  }

  static #round_zoom(zoom) {
    if (zoom < 4) {
      return zoom
    } else {
      var fudge_factor = CGoL.#zoom_fudge_factor(zoom)
      return Math.round(zoom * fudge_factor) / fudge_factor
    }
  }

  static #grid_canvas_size(zoom) {
    if (zoom < 4) {
      return 1 // It doesn't make sense to draw a grid if it would obscure the cells
    } else {
      return zoom * CGoL.#zoom_fudge_factor(zoom)
    }
  }

  static #zoom_fudge_factor(zoom) {
    if (zoom < 4) {
      return null
    } else if (zoom < 8) {
      return 16
    } else if (zoom < 16) {
      return 8
    } else {
      return 4
    }
  }

  draw(options={}, timestamp) {
    if (timestamp === null || timestamp === undefined) {
      this.#draw_inner(options)
    } else {
      var cache_expired = timestamp - this.#last_draw_time >= 1000
      // TODO: Make the cache interval changeable using the speed slider
      var changed_size = this.canvas.width !== this.#last_width
                         || this.canvas.height !== this.#last_height
      if (this.playing) {
        var time_since_tick = timestamp - this.#last_tick_time
        var time_between_ticks = 1000/this.speed
        var step_forward_needed = time_since_tick >= time_between_ticks
        if (step_forward_needed) {
          this.step_forward()
          this.#last_tick_time += time_between_ticks
        }
      }
      if (cache_expired
          || changed_size
          || this.#changed_camera
          || this.#changed_pattern) {
        if (cache_expired) {
          this.#last_draw_time = timestamp
        }
        if (changed_size) {
          this.#last_width = this.canvas.width
          this.#last_height = this.canvas.height
        }
        if (this.#changed_camera) {
          this.#changed_camera = false
          // Because the camera changed, the gridlines need to be updated as well
          this.#grid_canvas.width = this.#grid_canvas.height = CGoL.#grid_canvas_size(this.zoom)
        }
        this.#changed_pattern = false
        this.#draw_inner(options)
      } else {
        this.#ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.#ctx.putImageData(this.#cached_picture, 0, 0)
      }
      this.#last_animation_frame = requestAnimationFrame((t) => this.draw(options, t))
    }
  }

  stop_drawing() {
    cancelAnimationFrame(this.#last_animation_frame)
  }
  
  #draw_inner(options={}) {
    var colorblind = options.colorblind ?? false
    var can_use_symbols = colorblind && this.zoom >= 6
    var show_grid = options.grid ?? true
    var can_use_grid = show_grid && this.zoom >= 6
    
    var start_time = performance.now() // DEBUG
    
    var canvas = this.canvas
    var ctx = this.#ctx
    var grid_canvas = this.#grid_canvas
    var grid_ctx = this.#grid_ctx
    var grid_size = this.grid_size
    var cell_size = this.zoom
    var pattern_center_x = this.pattern_x + this.pattern_width/2
    var pattern_center_y = this.pattern_y + this.pattern_height/2
    var true_x_offset = (this.x_offset + pattern_center_x*cell_size - canvas.width/2) | 0
    var true_y_offset = (this.y_offset + pattern_center_y*cell_size - canvas.height/2) | 0
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the border
    var draw_left_x = Math.floor(true_x_offset / cell_size)
    var draw_right_x = Math.ceil((true_x_offset + canvas.width) / cell_size)
    var draw_top_y = Math.floor(true_y_offset / cell_size)
    var draw_bottom_y = Math.ceil((true_y_offset + canvas.height) / cell_size)
    var border_visible = draw_left_x < 0 || draw_right_x >= grid_size
                         || draw_top_y < 0 || draw_bottom_y >= grid_size
    if (can_use_symbols && border_visible) {
      grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height)
      grid_ctx.fillStyle = '#0A397F'
      grid_ctx.fillRect(0, 0, grid_canvas.width, grid_canvas.height)
      var original_x = Math.floor(true_x_offset / cell_size) * cell_size - true_x_offset
      var original_y = Math.floor(true_y_offset / cell_size) * cell_size - true_y_offset
      for (var y = original_y; y < grid_canvas.height; y += cell_size) {
        for (var x = original_x; x < grid_canvas.width; x += cell_size) {
          var left_x = x | 0
          var right_x = (x + cell_size) | 0
          var width = right_x - left_x
          var top_y = y | 0
          var bottom_y = (y + cell_size) | 0
          var height = bottom_y - top_y
          grid_ctx.drawImage(images['cell-icon-8'], left_x, top_y, width, height)
        }
      }
      const border_pattern = ctx.createPattern(grid_canvas, 'repeat')
      ctx.fillStyle = border_pattern
    } else {
      ctx.fillStyle = '#0A397F'
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000000'
    var left_x = (-true_x_offset) | 0
    var right_x = (-true_x_offset + grid_size*cell_size) | 0
    var width = right_x - left_x
    var top_y = (-true_y_offset) | 0
    var bottom_y = (-true_y_offset + grid_size*cell_size) | 0
    var height = bottom_y - top_y
    ctx.fillRect(left_x, top_y, width, height)
    
    var draw_left_x = Math.max(0, draw_left_x)
    var draw_right_x = Math.min(grid_size, draw_right_x)
    var draw_top_y = Math.max(0, draw_top_y)
    var draw_bottom_y = Math.min(grid_size, draw_bottom_y)
    for (var i = draw_top_y; i < draw_bottom_y; ++i) {
      for (var j = draw_left_x; j < draw_right_x; ++j) {
        if (i < 0 || i >= grid_size || j < 0 || j >= grid_size) {
          var cell_type = 4
          var cell_type_id = 8 // Unchangeable off
        } else {
          var cell_position = i*grid_size + j
          var cell = this.board[cell_position]
          var cell_type = this.cell_types[cell_position]
          var cell_type_id = cell_type*2 + cell
        }
        switch (cell_type_id) {
          case 0: // We don't need to be drawing empty cells
            continue
          case 1: ctx.fillStyle = '#FFFFFF'; break;
          case 2: ctx.fillStyle = '#76160A'; break;
          case 3: ctx.fillStyle = '#FF978A'; break;
          case 4: ctx.fillStyle = '#08631A'; break;
          case 5: ctx.fillStyle = '#33FF5C'; break;
          case 6: ctx.fillStyle = '#635B08'; break;
          case 7: ctx.fillStyle = '#FFEE33'; break;
          case 8: ctx.fillStyle = '#0A397F'; break;
          case 9: ctx.fillStyle = '#8FC9FF'; break;
          case 10: case 12: case 14: case 16: case 18: case 20: case 22: case 24:
            ctx.fillStyle = '#640A7F'
            break
          case 11: case 13: case 15: case 17: case 19: case 21: case 23: case 25:
            ctx.fillStyle = '#E799FF'
            break
        }
        var left_x = (j * cell_size - true_x_offset) | 0
        var right_x = ((j + 1) * cell_size - true_x_offset) | 0
        var width = right_x - left_x
        var top_y = (i * cell_size - true_y_offset) | 0
        var bottom_y = ((i + 1) * cell_size - true_y_offset) | 0
        var height = bottom_y - top_y
        ctx.fillRect(left_x, top_y, width, height)
        if (can_use_symbols && cell_type) {
          /* Explanation of the bare cell_type:
             cell_type_id has to be >= 2 in order to use symbols.
             This implies cell_type >= 1, meaning cell_type is truthy. */
          ctx.drawImage(images[`cell-icon-${cell_type_id}`], left_x, top_y, width, height)
        }
      }
    }

    // Draw the grid
    if (can_use_grid) {
      grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height)
      var grid_color = Math.round(180 - 2000 / (cell_size + 10))
      grid_ctx.strokeStyle = `rgb(${grid_color}, ${grid_color}, ${grid_color})`
      // Modulo doesn't work like this with negative numbers
      var x = Math.ceil(true_x_offset / cell_size) * cell_size - true_x_offset
      while (x < grid_canvas.width) {
        grid_ctx.beginPath()
        grid_ctx.moveTo(x | 0, 0)
        grid_ctx.lineTo(x | 0, grid_canvas.height)
        grid_ctx.stroke()
        x += cell_size
      }
      var y = Math.ceil(true_y_offset / cell_size) * cell_size - true_y_offset
      while (y < grid_canvas.height) {
        grid_ctx.beginPath()
        grid_ctx.moveTo(0, y | 0)
        grid_ctx.lineTo(grid_canvas.width, y | 0)
        grid_ctx.stroke()
        y += cell_size
      }
      // Put the grid on the main canvas
      const pattern = ctx.createPattern(grid_canvas, 'repeat')
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // START DEBUG
    ctx.font = '30px sans-serif'
    ctx.fillStyle = 'white'
    var time_ms = Math.round((performance.now() - start_time) * 1000) / 1000
    ctx.fillText(`${time_ms} ms`, 50, 150)
    // END DEBUG
    
    this.#cached_picture = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
}

export {CGoL}
