(function () {
  'use strict';

  /**
   * @preserve
   * Kontra.js v10.0.2
   */
  /**
   * A group of helpful functions that are commonly used for game development. Includes things such as converting between radians and degrees and getting random integers.
   *
   * ```js
   * import { degToRad } from 'kontra';
   *
   * let radians = degToRad(180);  // => 3.14
   * ```
   * @sectionName Helpers
   */


  /**
   * Rotate a point by an angle.
   * @function rotatePoint
   *
   * @param {{x: Number, y: Number}} point - The {x,y} point to rotate.
   * @param {Number} angle - Angle (in radians) to rotate.
   *
   * @returns {{x: Number, y: Number}} The new x and y coordinates after rotation.
   */
  function rotatePoint(point, angle) {
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    return {
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos
    };
  }

  /**
   * Clamp a number between two values, preventing it from going below or above the minimum and maximum values.
   * @function clamp
   *
   * @param {Number} min - Min value.
   * @param {Number} max - Max value.
   * @param {Number} value - Value to clamp.
   *
   * @returns {Number} Value clamped between min and max.
   */
  function clamp(min, max, value) {
    return Math.min(Math.max(min, value), max);
  }

  /**
   * Save an item to localStorage. A value of `undefined` will remove the item from localStorage.
   * @function setStoreItem
   *
   * @param {String} key - The name of the key.
   * @param {*} value - The value to store.
   */
  function setStoreItem(key, value) {
    if (value == undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * Retrieve an item from localStorage and convert it back to its original type.
   *
   * Normally when you save a value to LocalStorage it converts it into a string. So if you were to save a number, it would be saved as `"12"` instead of `12`. This function enables the value to be returned as `12`.
   * @function getStoreItem
   *
   * @param {String} key - Name of the key of the item to retrieve.
   *
   * @returns {*} The retrieved item.
   */
  function getStoreItem(key) {
    let value = localStorage.getItem(key);

    try {
      value = JSON.parse(value);
    } catch (e) {
      // do nothing
    }

    return value;
  }

  let noop = () => {};

  /**
   * Remove an item from an array.
   *
   * @param {*[]} array - Array to remove from.
   * @param {*} item - Item to remove.
   *
   * @returns {Boolean|undefined} True if the item was removed.
   */
  function removeFromArray(array, item) {
    let index = array.indexOf(item);
    if (index != -1) {
      array.splice(index, 1);
      return true;
    }
  }

  /**
   * A simple event system. Allows you to hook into Kontra lifecycle events or create your own, such as for [Plugins](api/plugin).
   *
   * ```js
   * import { on, off, emit } from 'kontra';
   *
   * function callback(a, b, c) {
   *   console.log({a, b, c});
   * });
   *
   * on('myEvent', callback);
   * emit('myEvent', 1, 2, 3);  //=> {a: 1, b: 2, c: 3}
   * off('myEvent', callback);
   * ```
   * @sectionName Events
   */

  // expose for testing
  let callbacks$2 = {};

  /**
   * There are currently only three lifecycle events:
   * - `init` - Emitted after `kontra.init()` is called.
   * - `tick` - Emitted every frame of [GameLoop](api/gameLoop) before the loops `update()` and `render()` functions are called.
   * - `assetLoaded` - Emitted after an asset has fully loaded using the asset loader. The callback function is passed the asset and the url of the asset as parameters.
   * @sectionName Lifecycle Events
   */

  /**
   * Register a callback for an event to be called whenever the event is emitted. The callback will be passed all arguments used in the `emit` call.
   * @function on
   *
   * @param {String} event - Name of the event.
   * @param {Function} callback - Function that will be called when the event is emitted.
   */
  function on(event, callback) {
    callbacks$2[event] = callbacks$2[event] || [];
    callbacks$2[event].push(callback);
  }

  /**
   * Call all callback functions for the event. All arguments will be passed to the callback functions.
   * @function emit
   *
   * @param {String} event - Name of the event.
   * @param {...*} args - Comma separated list of arguments passed to all callbacks.
   */
  function emit(event, ...args) {
    (callbacks$2[event] || []).map(fn => fn(...args));
  }

  /**
   * Functions for initializing the Kontra library and getting the canvas and context
   * objects.
   *
   * ```js
   * import { getCanvas, getContext, init } from 'kontra';
   *
   * let { canvas, context } = init();
   *
   * // or can get canvas and context through functions
   * canvas = getCanvas();
   * context = getContext();
   * ```
   * @sectionName Core
   */

  let canvasEl, context$1;

  // allow contextless environments, such as using ThreeJS as the main
  // canvas, by proxying all canvas context calls
  let handler$1 = {
    // by using noop we can proxy both property and function calls
    // so neither will throw errors
    get(target, key) {
      // export for testing
      if (key == '_proxy') return true;
      return noop;
    }
  };

  /**
   * Return the context object.
   * @function getContext
   *
   * @returns {CanvasRenderingContext2D} The context object the game draws to.
   */
  function getContext() {
    return context$1;
  }

  /**
   * Initialize the library and set up the canvas. Typically you will call `init()` as the first thing and give it the canvas to use. This will allow all Kontra objects to reference the canvas when created.
   *
   * ```js
   * import { init } from 'kontra';
   *
   * let { canvas, context } = init('game');
   * ```
   * @function init
   *
   * @param {String|HTMLCanvasElement} [canvas] - The canvas for Kontra to use. Can either be the ID of the canvas element or the canvas element itself. Defaults to using the first canvas element on the page.
   * @param {Object} [options] - Game options.
   * @param {Boolean} [options.contextless=false] - If the game will run in an contextless environment. A contextless environment uses a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) for the `canvas` and `context` so all property and function calls will noop.
   *
   * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}} An object with properties `canvas` and `context`. `canvas` it the canvas element for the game and `context` is the context object the game draws to.
   */
  function init$1(canvas, { contextless = false } = {}) {
    // check if canvas is a string first, an element next, or default to
    // getting first canvas on page
    canvasEl =
      document.getElementById(canvas) ||
      canvas ||
      document.querySelector('canvas');

    if (contextless) {
      canvasEl = canvasEl || new Proxy({}, handler$1);
    }


    context$1 = canvasEl.getContext('2d') || new Proxy({}, handler$1);
    context$1.imageSmoothingEnabled = false;

    emit('init');

    return { canvas: canvasEl, context: context$1 };
  }

  /**
   * A simple 2d vector object. Takes either separate `x` and `y` coordinates or a Vector-like object.
   *
   * ```js
   * import { Vector } from 'kontra';
   *
   * let vector = Vector(100, 200);
   * let vector2 = Vector({x: 100, y: 200});
   * ```
   * @class Vector
   *
   * @param {Number|{x: number, y: number}} [x=0] - X coordinate of the vector or a Vector-like object. If passing an object, the `y` param is ignored.
   * @param {Number} [y=0] - Y coordinate of the vector.
   */
  class Vector {
    constructor(x = 0, y = 0, vec = {}) {
      if (x.x != undefined) {
        this.x = x.x;
        this.y = x.y;
      }
      else {
        this.x = x;
        this.y = y;
      }

    }

    /**
     * Set the x and y coordinate of the vector.
     * @memberof Vector
     * @function set
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to set coordinates from.
     */
    set(vec) {
      this.x = vec.x;
      this.y = vec.y;
    }

    /**
     * Calculate the addition of the current vector with the given vector.
     * @memberof Vector
     * @function add
     *
     * @param {Vector|{x: number, y: number}} vector - Vector to add to the current Vector.
     *
     * @returns {Vector} A new Vector instance whose value is the addition of the two vectors.
     */
    add(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y, this);
    }









  }

  function factory$a() {
    return new Vector(...arguments);
  }

  /**
   * This is a private class that is used just to help make the GameObject class more manageable and smaller.
   *
   * It maintains everything that can be changed in the update function:
   * position
   * velocity
   * acceleration
   * ttl
   */
  class Updatable {
    constructor(properties) {
      return this.init(properties);
    }

    init(properties = {}) {
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The game objects position vector. Represents the local position of the object as opposed to the [world](api/gameObject#world) position.
       * @property {Vector} position
       * @memberof GameObject
       * @page GameObject
       */
      this.position = factory$a();

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------




      // add all properties to the object, overriding any defaults
      Object.assign(this, properties);
    }

    /**
     * Update the position of the game object and all children using their velocity and acceleration. Calls the game objects [advance()](api/gameObject#advance) function.
     * @memberof GameObject
     * @function update
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     */
    update(dt) {
      this.advance(dt);
    }

    /**
     * Move the game object by its acceleration and velocity. If you pass `dt` it will multiply the vector and acceleration by that number. This means the `dx`, `dy`, `ddx` and `ddy` should be how far you want the object to move in 1 second rather than in 1 frame.
     *
     * If you override the game objects [update()](api/gameObject#update) function with your own update function, you can call this function to move the game object normally.
     *
     * ```js
     * import { GameObject } from 'kontra';
     *
     * let gameObject = GameObject({
     *   x: 100,
     *   y: 200,
     *   width: 20,
     *   height: 40,
     *   dx: 5,
     *   dy: 2,
     *   update: function() {
     *     // move the game object normally
     *     this.advance();
     *
     *     // change the velocity at the edges of the canvas
     *     if (this.x < 0 ||
     *         this.x + this.width > this.context.canvas.width) {
     *       this.dx = -this.dx;
     *     }
     *     if (this.y < 0 ||
     *         this.y + this.height > this.context.canvas.height) {
     *       this.dy = -this.dy;
     *     }
     *   }
     * });
     * ```
     * @memberof GameObject
     * @function advance
     * @page GameObject
     *
     * @param {Number} [dt] - Time since last update.
     *
     */
    advance(dt) {


    }

    // --------------------------------------------------
    // velocity
    // --------------------------------------------------


    // --------------------------------------------------
    // acceleration
    // --------------------------------------------------


    // --------------------------------------------------
    // ttl
    // --------------------------------------------------


    _pc() {}
  }

  /**
   * The base class of most renderable classes. Handles things such as position, rotation, anchor, and the update and render life cycle.
   *
   * Typically you don't create a GameObject directly, but rather extend it for new classes.
   * @class GameObject
   *
   * @param {Object} [properties] - Properties of the game object.
   * @param {Number} [properties.x] - X coordinate of the position vector.
   * @param {Number} [properties.y] - Y coordinate of the position vector.
   * @param {Number} [properties.width] - Width of the game object.
   * @param {Number} [properties.height] - Height of the game object.
   * @param {Number} [properties.radius] - Radius of the game object. **Note:** radius is mutually exclusive with `width` and `height` as the GameObject will always use `radius` over `width` and `height` for any logic.
   *
   * @param {CanvasRenderingContext2D} [properties.context] - The context the game object should draw to. Defaults to [core.getContext()](api/core#getContext).
   *
   * @param {Number} [properties.dx] - X coordinate of the velocity vector.
   * @param {Number} [properties.dy] - Y coordinate of the velocity vector.
   * @param {Number} [properties.ddx] - X coordinate of the acceleration vector.
   * @param {Number} [properties.ddy] - Y coordinate of the acceleration vector.
   * @param {Number} [properties.ttl=Infinity] - How many frames the game object should be alive. Used by [Pool](api/pool).
   *
   * @param {{x: Number, y: Number}} [properties.anchor={x:0,y:0}] - The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
   * @param {GameObject[]} [properties.children] - Children to add to the game object.
   * @param {Number} [properties.opacity=1] - The opacity of the game object.
   * @param {Number} [properties.rotation=0] - The rotation around the anchor in radians.
   * @param {Number} [properties.drotation=0] - The angular velocity of the rotation in radians.
   * @param {Number} [properties.ddrotation=0] - The angular acceleration of the rotation in radians.
   * @param {Number} [properties.scaleX=1] - The x scale of the game object.
   * @param {Number} [properties.scaleY=1] - The y scale of the game object.
   *
   * @param {(dt?: Number) => void} [properties.update] - Function called every frame to update the game object.
   * @param {Function} [properties.render] - Function called every frame to render the game object.
   *
   * @param {...*} properties.props - Any additional properties you need added to the game object. For example, if you pass `gameObject({type: 'player'})` then the game object will also have a property of the same name and value. You can pass as many additional properties as you want.
   */
  class GameObject extends Updatable {
    /**
     * @docs docs/api_docs/gameObject.js
     */

    /**
     * Use this function to reinitialize a game object. It takes the same properties object as the constructor. Useful it you want to repurpose a game object.
     * @memberof GameObject
     * @function init
     *
     * @param {Object} properties - Properties of the game object.
     */
    init({
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The width of the game object. Represents the local width of the object as opposed to the [world](api/gameObject#world) width.
       * @memberof GameObject
       * @property {Number} width
       */
      width = 0,

      /**
       * The height of the game object. Represents the local height of the object as opposed to the [world](api/gameObject#world) height.
       * @memberof GameObject
       * @property {Number} height
       */
      height = 0,

      /**
       * The context the game object will draw to.
       * @memberof GameObject
       * @property {CanvasRenderingContext2D} context
       */
      context = getContext(),

      render = this.draw,
      update = this.advance,

      // --------------------------------------------------
      // optionals
      // --------------------------------------------------

      /**
       * The radius of the game object. Represents the local radius of the object as opposed to the [world](api/gameObject#world) radius.
       * @memberof GameObject
       * @property {Number} radius
       */


      /**
       * The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
       * @memberof GameObject
       * @property {{x: Number, y: Number}} anchor
       *
       * @example
       * // exclude-code:start
       * let { GameObject } = kontra;
       * // exclude-code:end
       * // exclude-script:start
       * import { GameObject } from 'kontra';
       * // exclude-script:end
       *
       * let gameObject = GameObject({
       *   x: 150,
       *   y: 100,
       *   width: 50,
       *   height: 50,
       *   color: 'red',
       *   // exclude-code:start
       *   context: context,
       *   // exclude-code:end
       *   render: function() {
       *     this.context.fillStyle = this.color;
       *     this.context.fillRect(0, 0, this.height, this.width);
       *   }
       * });
       *
       * function drawOrigin(gameObject) {
       *   gameObject.context.fillStyle = 'yellow';
       *   gameObject.context.beginPath();
       *   gameObject.context.arc(gameObject.x, gameObject.y, 3, 0, 2*Math.PI);
       *   gameObject.context.fill();
       * }
       *
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 0.5, y: 0.5};
       * gameObject.x = 300;
       * gameObject.render();
       * drawOrigin(gameObject);
       *
       * gameObject.anchor = {x: 1, y: 1};
       * gameObject.x = 450;
       * gameObject.render();
       * drawOrigin(gameObject);
       */
      anchor = { x: 0, y: 0 },




      ...props
    } = {}) {

      // by setting defaults to the parameters and passing them into
      // the init, we can ensure that a parent class can set overriding
      // defaults and the GameObject won't undo it (if we set
      // `this.width` then no parent could provide a default value for
      // width)
      super.init({
        width,
        height,
        context,

        anchor,




        ...props
      });

      // di = done init
      this._di = true;
      this._uw();


      // rf = render function
      this._rf = render;

      // uf = update function
      this._uf = update;

      on('init', () => {
        this.context ??= getContext();
      });
    }

    /**
     * Update all children
     */
    update(dt) {
      this._uf(dt);

    }

    /**
     * Render the game object and all children. Calls the game objects [draw()](api/gameObject#draw) function.
     * @memberof GameObject
     * @function render
     */
    render() {
      let context = this.context;
      context.save();

      // 1) translate to position
      //
      // it's faster to only translate if one of the values is non-zero
      // rather than always translating
      // @see https://jsperf.com/translate-or-if-statement/2
      if (this.x || this.y) {
        context.translate(this.x, this.y);
      }



      // 5) translate to the anchor so (0,0) is the top left corner
      // for the render function
      let width = this.width;
      let height = this.height;


      let anchorX = -width * this.anchor.x;
      let anchorY = -height * this.anchor.y;

      if (anchorX || anchorY) {
        context.translate(anchorX, anchorY);
      }


      this._rf();

      // 7) translate back to the anchor so children use the correct
      // x/y value from the anchor
      if (anchorX || anchorY) {
        context.translate(-anchorX, -anchorY);
      }


      context.restore();
    }

    /**
     * Draw the game object at its X and Y position, taking into account rotation, scale, and anchor.
     *
     * Do note that the canvas has been rotated and translated to the objects position (taking into account anchor), so {0,0} will be the top-left corner of the game object when drawing.
     *
     * If you override the game objects `render()` function with your own render function, you can call this function to draw the game object normally.
     *
     * ```js
     * let { GameObject } = kontra;
     *
     * let gameObject = GameObject({
     *  x: 290,
     *  y: 80,
     *  width: 20,
     *  height: 40,
     *
     *  render: function() {
     *    // draw the game object normally (perform rotation and other transforms)
     *    this.draw();
     *
     *    // outline the game object
     *    this.context.strokeStyle = 'yellow';
     *    this.context.lineWidth = 2;
     *    this.context.strokeRect(0, 0, this.width, this.height);
     *  }
     * });
     *
     * gameObject.render();
     * ```
     * @memberof GameObject
     * @function draw
     */
    draw() {}

    /**
     * Sync property changes from the parent to the child
     */
    _pc() {
      this._uw();

    }

    /**
     * X coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} x
     */
    get x() {
      return this.position.x;
    }

    /**
     * Y coordinate of the position vector.
     * @memberof GameObject
     * @property {Number} y
     */
    get y() {
      return this.position.y;
    }

    set x(value) {
      this.position.x = value;

      // pc = property changed
      this._pc();
    }

    set y(value) {
      this.position.y = value;
      this._pc();
    }

    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      this._w = value;
      this._pc();
    }

    get height() {
      // h = height
      return this._h;
    }

    set height(value) {
      this._h = value;
      this._pc();
    }

    /**
     * Update world properties
     */
    _uw() {
      // don't update world properties until after the init has finished
      if (!this._di) return;


      // wx = world x, wy = world y
      this._wx = this.x;
      this._wy = this.y;

      // ww = world width, wh = world height
      this._ww = this.width;
      this._wh = this.height;





    }

    /**
     * The world position, width, height, opacity, rotation, and scale. The world property is the true position, width, height, etc. of the object, taking into account all parents.
     *
     * The world property does not adjust for anchor or scale, so if you set a negative scale the world width or height could be negative. Use [getWorldRect](api/helpers#getWorldRect) to get the world position and size adjusted for anchor and scale.
     * @property {{x: Number, y: Number, width: Number, height: Number, opacity: Number, rotation: Number, scaleX: Number, scaleY: Number}} world
     * @memberof GameObject
     */
    get world() {
      return {
        x: this._wx,
        y: this._wy,
        width: this._ww,
        height: this._wh,




      };
    }

    // --------------------------------------------------
    // group
    // --------------------------------------------------


    // --------------------------------------------------
    // radius
    // --------------------------------------------------


    // --------------------------------------------------
    // opacity
    // --------------------------------------------------


    // --------------------------------------------------
    // rotation
    // --------------------------------------------------


    // --------------------------------------------------
    // scale
    // --------------------------------------------------

  }

  /**
   * A versatile way to update and draw your sprites. It can handle simple rectangles, images, and sprite sheet animations. It can be used for your main player object as well as tiny particles in a particle engine.
   * @class Sprite
   * @extends GameObject
   *
   * @param {Object} [properties] - Properties of the sprite.
   * @param {String} [properties.color] - Fill color for the game object if no image or animation is provided.
   * @param {HTMLImageElement|HTMLCanvasElement} [properties.image] - Use an image to draw the sprite.
   * @param {{[name: String] : Animation}} [properties.animations] - An object of [Animations](api/animation) from a [Spritesheet](api/spriteSheet) to animate the sprite.
   */
  class Sprite extends GameObject {
    /**
     * @docs docs/api_docs/sprite.js
     */

    init({
      /**
       * The color of the game object if it was passed as an argument.
       * @memberof Sprite
       * @property {String} color
       */


      ...props
    } = {}) {
      super.init({
        ...props
      });
    }


    draw() {


      if (this.color) {
        this.context.fillStyle = this.color;


        this.context.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  function factory$8() {
    return new Sprite(...arguments);
  }

  let fontSizeRegex = /(\d+)(\w+)/;

  function parseFont(font) {
    if (!font) return { computed: 0 };

    let match = font.match(fontSizeRegex);

    // coerce string to number
    // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#coercion-to-test-for-types
    let size = +match[1];
    let unit = match[2];
    let computed = size;

    return {
      size,
      unit,
      computed
    };
  }

  /**
   * An object for drawing text to the screen. Supports newline characters as well as automatic new lines when setting the `width` property.
   *
   * You can also display RTL languages by setting the attribute `dir="rtl"` on the main canvas element. Due to the limited browser support for individual text to have RTL settings, it must be set globally for the entire game.
   *
   * @example
   * // exclude-code:start
   * let { Text } = kontra;
   * // exclude-code:end
   * // exclude-script:start
   * import { Text } from 'kontra';
   * // exclude-script:end
   *
   * let text = Text({
   *   text: 'Hello World!\nI can even be multiline!',
   *   font: '32px Arial',
   *   color: 'white',
   *   x: 300,
   *   y: 100,
   *   anchor: {x: 0.5, y: 0.5},
   *   textAlign: 'center'
   * });
   * // exclude-code:start
   * text.context = context;
   * // exclude-code:end
   *
   * text.render();
   * @class Text
   * @extends GameObject
   *
   * @param {Object} properties - Properties of the text.
   * @param {String} properties.text - The text to display.
   * @param {String} [properties.font] - The [font](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font) style. Defaults to the main context font.
   * @param {String} [properties.color] - Fill color for the text. Defaults to the main context fillStyle.
   * @param {Number} [properties.width] - Set a fixed width for the text. If set, the text will automatically be split into new lines that will fit the size when possible.
   * @param {String} [properties.textAlign='left'] - The [textAlign](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/textAlign) for the context. If the `dir` attribute is set to `rtl` on the main canvas, the text will automatically be aligned to the right, but you can override that by setting this property.
   * @param {Number} [properties.lineHeight=1] - The distance between two lines of text.
   * @param {String} [properties.strokeColor] - Stroke color for the text.
   * @param {number} [properties.lineWidth] - Stroke line width for the text.
   */
  class Text extends GameObject {
    init({
      // --------------------------------------------------
      // defaults
      // --------------------------------------------------

      /**
       * The string of text. Use newline characters to create multi-line strings.
       * @memberof Text
       * @property {String} text
       */
      text = '',

      /**
       * The text alignment.
       * @memberof Text
       * @property {String} textAlign
       */
      textAlign = '',

      /**
       * The distance between two lines of text. The value is multiplied by the texts font size.
       * @memberof Text
       * @property {Number} lineHeight
       */
      lineHeight = 1,

      /**
       * The font style.
       * @memberof Text
       * @property {String} font
       */
      font = getContext()?.font,

      /**
       * The color of the text.
       * @memberof Text
       * @property {String} color
       */

      ...props
    } = {}) {
      // cast to string
      text = '' + text;

      super.init({
        text,
        textAlign,
        lineHeight,
        font,
        ...props
      });

      // p = prerender
      if (this.context) {
        this._p();
      }

      on('init', () => {
        this.font ??= getContext().font;
        this._p();
      });
    }

    // keep width and height getters/settings so we can set _w and _h
    // and not trigger infinite call loops
    get width() {
      // w = width
      return this._w;
    }

    set width(value) {
      // d = dirty
      this._d = true;
      this._w = value;

      // fw = fixed width
      this._fw = value;
    }

    get text() {
      return this._t;
    }

    set text(value) {
      this._d = true;
      this._t = '' + value;
    }

    get font() {
      return this._f;
    }

    set font(value) {
      this._d = true;
      this._f = value;
      this._fs = parseFont(value).computed;
    }

    get lineHeight() {
      // lh = line height
      return this._lh;
    }

    set lineHeight(value) {
      this._d = true;
      this._lh = value;
    }

    render() {
      if (this._d) {
        this._p();
      }
      super.render();
    }

    /**
     * Calculate the font width, height, and text strings before rendering.
     */
    _p() {
      // s = strings
      this._s = [];
      this._d = false;
      let context = this.context;
      let text = [this.text];

      context.font = this.font;




      if (!this._s.length) {
        this._s.push(this.text);
        this._w = this._fw || context.measureText(this.text).width;
      }

      this.height =
        this._fs + (this._s.length - 1) * this._fs * this.lineHeight;
      this._uw();
    }

    draw() {
      let alignX = 0;
      let textAlign = this.textAlign;
      let context = this.context;


      alignX =
        textAlign == 'right'
          ? this.width
          : textAlign == 'center'
          ? (this.width / 2) | 0
          : 0;

      this._s.map((str, index) => {
        context.textBaseline = 'top';
        context.textAlign = textAlign;
        context.fillStyle = this.color;
        context.font = this.font;



        context.fillText(
          str,
          alignX,
          this._fs * this.lineHeight * index
        );
      });
    }
  }

  function factory$7() {
    return new Text(...arguments);
  }

  /**
   * Clear the canvas.
   */
  function clear(context) {
    let canvas = context.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * The game loop updates and renders the game every frame. The game loop is stopped by default and will not start until the loops `start()` function is called.
   *
   * The game loop uses a time-based animation with a fixed `dt` to [avoid frame rate issues](http://blog.sklambert.com/using-time-based-animation-implement/). Each update call is guaranteed to equal 1/60 of a second.
   *
   * This means that you can avoid having to do time based calculations in your update functions and instead do fixed updates.
   *
   * ```js
   * import { Sprite, GameLoop } from 'kontra';
   *
   * let sprite = Sprite({
   *   x: 100,
   *   y: 200,
   *   width: 20,
   *   height: 40,
   *   color: 'red'
   * });
   *
   * let loop = GameLoop({
   *   update: function(dt) {
   *     // no need to determine how many pixels you want to
   *     // move every second and multiple by dt
   *     // sprite.x += 180 * dt;
   *
   *     // instead just update by how many pixels you want
   *     // to move every frame and the loop will ensure 60FPS
   *     sprite.x += 3;
   *   },
   *   render: function() {
   *     sprite.render();
   *   }
   * });
   *
   * loop.start();
   * ```
   * @class GameLoop
   *
   * @param {Object} properties - Properties of the game loop.
   * @param {(dt: Number) => void} [properties.update] - Function called every frame to update the game. Is passed the fixed `dt` as a parameter.
   * @param {Function} properties.render - Function called every frame to render the game.
   * @param {Number}   [properties.fps=60] - Desired frame rate.
   * @param {Boolean}  [properties.clearCanvas=true] - Clear the canvas every frame before the `render()` function is called.
   * @param {CanvasRenderingContext2D} [properties.context] - The context that should be cleared each frame if `clearContext` is not set to `false`. Defaults to [core.getContext()](api/core#getContext).
   * @param {Boolean} [properties.blur=false] - If the loop should still update and render if the page does not have focus.
   */
  function GameLoop({
    fps = 60,
    clearCanvas = true,
    update = noop,
    render,
    context = getContext(),
    blur = false
  } = {}) {
    // check for required functions

    // animation variables
    let accumulator = 0;
    let delta = 1e3 / fps; // delta between performance.now timings (in ms)
    let step = 1 / fps;
    let clearFn = clearCanvas ? clear : noop;
    let last, rAF, now, dt, loop;
    let focused = true;

    if (!blur) {
      window.addEventListener('focus', () => {
        focused = true;
      });
      window.addEventListener('blur', () => {
        focused = false;
      });
    }

    on('init', () => {
      loop.context ??= getContext();
    });

    /**
     * Called every frame of the game loop.
     */
    function frame() {
      rAF = requestAnimationFrame(frame);

      // don't update the frame if tab isn't focused
      if (!focused) return;

      now = performance.now();
      dt = now - last;
      last = now;

      // prevent updating the game with a very large dt if the game
      // were to lose focus and then regain focus later
      if (dt > 1e3) {
        return;
      }

      accumulator += dt;

      while (accumulator >= delta) {
        emit('tick');
        loop.update(step);

        accumulator -= delta;
      }

      clearFn(loop.context);
      loop.render();
    }

    // game loop object
    loop = {
      /**
       * Called every frame to update the game. Put all of your games update logic here.
       * @memberof GameLoop
       * @function update
       *
       * @param {Number} [dt] - The fixed dt time of 1/60 of a frame.
       */
      update,

      /**
       * Called every frame to render the game. Put all of your games render logic here.
       * @memberof GameLoop
       * @function render
       */
      render,

      /**
       * If the game loop is currently stopped.
       *
       * ```js
       * import { GameLoop } from 'kontra';
       *
       * let loop = GameLoop({
       *   // ...
       * });
       * console.log(loop.isStopped);  //=> true
       *
       * loop.start();
       * console.log(loop.isStopped);  //=> false
       *
       * loop.stop();
       * console.log(loop.isStopped);  //=> true
       * ```
       * @memberof GameLoop
       * @property {Boolean} isStopped
       */
      isStopped: true,

      /**
       * The context the game loop will clear. Defaults to [core.getContext()](api/core#getCcontext).
       *
       * @memberof GameLoop
       * @property {CanvasRenderingContext2D} context
       */
      context,

      /**
       * Start the game loop.
       * @memberof GameLoop
       * @function start
       */
      start() {
        if (this.isStopped) {
          last = performance.now();
          this.isStopped = false;
          requestAnimationFrame(frame);
        }
      },

      /**
       * Stop the game loop.
       * @memberof GameLoop
       * @function stop
       */
      stop() {
        this.isStopped = true;
        cancelAnimationFrame(rAF);
      },

      // expose properties for testing
    };

    return loop;
  }

  /**
   * A simple gamepad API. You can use it move the main sprite or respond to gamepad events.
   *
   * **NOTE:** Gamepad support requires using a secure context (HTTPS) and the [GameLoop](api/gameLoop) (since the gamepad state must be checked every frame as there are no global event listeners for gamepad button / axes events).
   *
   * ```js
   * import { initGamepad, GameLoop, gamepadPressed } from 'kontra';
   *
   * // this function must be called first before gamepad
   * // functions will work
   * initGamepad();
   *
   * function update() {
   *   if (gamepadPressed('dpadleft')) {
   *     // move left
   *   }
   * }
   *
   * // using the GameLoop is required
   * let loop = kontra.GameLoop({
   *   // ...
   * })
   * loop.start();
   * ```
   * @sectionName Gamepad
   */

  /**
   * Below is a list of button names that are provided by default. If you need to extend or modify this list, you can use the [gamepadMap](api/gamepad#gamepadMap) property.
   *
   * - south _(Xbox controller: A; PS4 controller: cross)_
   * - east _(Xbox controller: B; PS4 controller: circle)_
   * - west _(Xbox controller: X; PS4 controller: square)_
   * - north _(Xbox controller: Y; PS4 controller: triangle)_
   * - leftshoulder _(Xbox controller: LB; PS4 controller: L1)_
   * - rightshoulder _(Xbox controller: RB; PS4 controller: R1)_
   * - lefttrigger _(Xbox controller: LT; PS4 controller: L2)_
   * - righttrigger _(Xbox controller: RT; PS4 controller: R2)_
   * - select _(Xbox controller: back/view; PS4 controller: share)_
   * - start _(Xbox controller: start/menu; PS4 controller: options)_
   * - leftstick
   * - rightstick
   * - dpadup
   * - dpaddown
   * - dpadleft
   * - dpadright
   *
   * @sectionName Available Buttons
   */

  let gamepads = [];
  let gamepaddownCallbacks = {};
  let gamepadupCallbacks = {};

  /**
   * A map of Gamepad button indices to button names. Modify this object to expand the list of [available buttons](api/gamepad#available-buttons). By default, the map uses the Xbox and PS4 controller button indicies.
   *
   * ```js
   * import { gamepadMap, gamepadPressed } from 'kontra';
   *
   * gamepadMap[2] = 'buttonWest';
   *
   * if (gamepadPressed('buttonWest')) {
   *   // handle west face button
   * }
   * ```
   * @property {{[key: Number]: String}} gamepadMap
   */
  let gamepadMap = {
    0: 'south',
    1: 'east',
    2: 'west',
    3: 'north',
    4: 'leftshoulder',
    5: 'rightshoulder',
    6: 'lefttrigger',
    7: 'righttrigger',
    8: 'select',
    9: 'start',
    10: 'leftstick',
    11: 'rightstick',
    12: 'dpadup',
    13: 'dpaddown',
    14: 'dpadleft',
    15: 'dpadright'
  };

  /**
   * Keep track of the connected gamepads so multiple gamepads can be used at a time.
   */
  function gamepadConnectedHandler(event) {
    gamepads[event.gamepad.index] = {
      pressedButtons: {},
      axes: {}
    };
  }

  /**
   * Remove disconnected gamepads
   */
  function gamepadDisconnectedHandler(event) {
    delete gamepads[event.gamepad.index];
  }

  /**
   * Reset pressed buttons and axes information.
   */
  function blurEventHandler$1() {
    gamepads.map(gamepad => {
      gamepad.pressedButtons = {};
      gamepad.axes = {};
    });
  }

  /**
   * Update the gamepad state. Call this function every frame only if you are not using the [GameLoop](api/gameLoop). Otherwise it is called automatically.
   *
   * ```js
   * import { initGamepad, updateGamepad, gamepadPressed } from 'kontra';
   *
   * initGamepad();
   *
   * function update() {
   *   // not using GameLoop so need to manually call update state
   *   updateGamepad();
   *
   *   if (gamepadPressed('dpadleft')) {
   *     // move left
   *   }
   * }
   *
   * ```
   * @function updateGamepad
   */
  function updateGamepad() {
    // in Chrome this a GamepadList but in Firefox it's an array
    let pads = navigator.getGamepads
      ? navigator.getGamepads()
      : navigator.webkitGetGamepads
      ? navigator.webkitGetGamepads
      : [];

    for (let i = 0; i < pads.length; i++) {
      let gamepad = pads[i];

      // a GamepadList will have a default length of 4 but use null for
      // any index that doesn't have a gamepad connected
      if (!gamepad) {
        continue;
      }

      gamepad.buttons.map((button, index) => {
        let buttonName = gamepadMap[index];
        let { pressed } = button;
        let { pressedButtons } = gamepads[gamepad.index];
        let state = pressedButtons[buttonName];

        // if the button was not pressed before and is now pressed
        // that's a gamepaddown event
        if (!state && pressed) {
          [
            gamepaddownCallbacks[gamepad.index],
            gamepaddownCallbacks
          ].map(callback => {
            callback?.[buttonName]?.(gamepad, button, buttonName);
          });
        }
        // if the button was pressed before and is now not pressed
        // that's a gamepadup event
        else if (state && !pressed) {
          [gamepadupCallbacks[gamepad.index], gamepadupCallbacks].map(
            callback => {
              callback?.[buttonName]?.(gamepad, button, buttonName);
            }
          );
        }

        pressedButtons[buttonName] = pressed;
      });

      let { axes } = gamepads[gamepad.index];
      axes.leftstickx = gamepad.axes[0];
      axes.leftsticky = gamepad.axes[1];
      axes.rightstickx = gamepad.axes[2];
      axes.rightsticky = gamepad.axes[3];
    }
  }

  /**
   * Initialize gamepad event listeners. This function must be called before using other gamepad functions.
   * @function initGamepad
   */
  function initGamepad() {
    window.addEventListener(
      'gamepadconnected',
      gamepadConnectedHandler
    );
    window.addEventListener(
      'gamepaddisconnected',
      gamepadDisconnectedHandler
    );
    window.addEventListener('blur', blurEventHandler$1);

    // update gamepad state each frame
    on('tick', updateGamepad);
  }

  /**
   * Register a function to be called when a gamepad button is pressed. Takes a single button or an array of buttons. Is passed the [Gamepad](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad) and the [GamepadButton](https://developer.mozilla.org/en-US/docs/Web/API/GamepadButton), and the buttonName that was pressed as parameters.
   *
   * When registering the function, you have the choice of registering to a specific gamepad or to all gamepads. To register to a specific gamepad, pass the desired gamepad index as the `gamepad` option. If the `gamepad` option is ommited the callback is bound to all gamepads instead of a specific one.
   *
   * You can register a callback for both a specific gamepad and for all gamepads in two different calls. When this happens, the specific gamepad callback will be called first and then the global one.
   *
   * ```js
   * import { initGamepad, onGamepad } from 'kontra';
   *
   * initGamepad();
   *
   * onGamepad('start', function(gamepad, button, buttonName) {
   *   // pause the game
   * });
   * onGamepad(['south', 'rightstick'], function(gamepad, button, buttonName) {
   *   // fire gun
   * });
   *
   * onGamepad('south', function() {
   *   // handle south button
   * }, {
   *   gamepad: 0  // register just for the gamepad at index 0
   * });
   * ```
   * @function onGamepad
   *
   * @param {String|String[]} buttons - Button or buttons to register callback for.
   * @param {(gamepad: Gamepad, button: GamepadButton, buttonName: string) => void} callback - The function to be called when the button is pressed.
   * @param {Object} [options] - Register options.
   * @param {Number} [options.gamepad] - Gamepad index. Defaults to registerting for all gamepads.
   * @param {'gamepaddown'|'gamepadup'} [options.handler='gamepaddown'] - Whether to register to the gamepaddown or gamepadup event.
   */
  function onGamepad(
    buttons,
    callback,
    { gamepad, handler = 'gamepaddown' } = {}
  ) {
    let callbacks =
      handler == 'gamepaddown'
        ? gamepaddownCallbacks
        : gamepadupCallbacks;

    // smaller than doing `Array.isArray(buttons) ? buttons : [buttons]`
    [].concat(buttons).map(button => {
      if (isNaN(gamepad)) {
        callbacks[button] = callback;
      } else {
        callbacks[gamepad] = callbacks[gamepad] || {};
        callbacks[gamepad][button] = callback;
      }
    });
  }

  /**
   * Get the value of a specific gamepad axis.
   *
   * Available axes are:
   *
   * - leftstickx
   * - leftsticky
   * - rightstickx
   * - rightsticky
   *
   * ```js
   * import { Sprite, initGamepad, gamepadAxis } from 'kontra';
   *
   * initGamepad();
   *
   * let sprite = Sprite({
   *   update: function() {
   *     // check the axis of the gamepad connected to index 0
   *     let axisX = gamepadAxis('leftstickx', 0);
   *     let axisY = gamepadAxis('leftsticky', 0);
   *
   *     if (axisX < -0.4) {
   *       // move left
   *     }
   *     else if (axisX > 0.4) {
   *       // move right
   *     }
   *
   *     if (axisY < -0.4) {
   *       // move up
   *     }
   *     else if (axisY > 0.4) {
   *       // move down
   *     }
   *   }
   * });
   * ```
   * @function gamepadAxis
   *
   * @param {String} name - Name of the axis.
   * @param {Number} gamepad - Index of the gamepad to check.
   *
   * @returns {Number} The value of the axis between -1.0 and 1.0.
   */
  function gamepadAxis(name, gamepad) {
    return gamepads[gamepad]?.axes[name] || 0;
  }

  /**
   * A simple keyboard API. You can use it move the main sprite or respond to a key press.
   *
   * ```js
   * import { initKeys, keyPressed } from 'kontra';
   *
   * // this function must be called first before keyboard
   * // functions will work
   * initKeys();
   *
   * function update() {
   *   if (keyPressed('arrowleft')) {
   *     // move left
   *   }
   * }
   * ```
   * @sectionName Keyboard
   */

  /**
   * Below is a list of keys that are provided by default. If you need to extend this list, you can use the [keyMap](api/keyboard#keyMap) property.
   *
   * - a-z
   * - 0-9
   * - enter, esc, space, arrowleft, arrowup, arrowright, arrowdown
   * @sectionName Available Keys
   */

  let keydownCallbacks = {};
  let keyupCallbacks = {};
  let pressedKeys = {};

  /**
   * A map of [KeyboardEvent code values](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values) to key names. Add to this object to expand the list of [available keys](api/keyboard#available-keys).
   *
   * ```js
   * import { keyMap, onKey } from 'kontra';
   *
   * keyMap['ControlRight'] = 'ctrl';
   *
   * onKey('ctrl', function(e) {
   *   // handle ctrl key
   * });
   * ```
   * @property {{[key in (String|Number)]: String}} keyMap
   */
  let keyMap = {
    // named keys
    Enter: 'enter',
    Escape: 'esc',
    Space: 'space',
    ArrowLeft: 'arrowleft',
    ArrowUp: 'arrowup',
    ArrowRight: 'arrowright',
    ArrowDown: 'arrowdown'
  };

  /**
   * Call the callback handler of an event.
   * @param {Function} callback
   * @param {KeyboardEvent} evt
   */
  function call(callback = noop, evt) {
    if (callback._pd) {
      evt.preventDefault();
    }
    callback(evt);
  }

  /**
   * Execute a function that corresponds to a keyboard key.
   *
   * @param {KeyboardEvent} evt
   */
  function keydownEventHandler(evt) {
    let key = keyMap[evt.code];
    let callback = keydownCallbacks[key];
    pressedKeys[key] = true;
    call(callback, evt);
  }

  /**
   * Set the released key to not being pressed.
   *
   * @param {KeyboardEvent} evt
   */
  function keyupEventHandler(evt) {
    let key = keyMap[evt.code];
    let callback = keyupCallbacks[key];
    pressedKeys[key] = false;
    call(callback, evt);
  }

  /**
   * Reset pressed keys.
   */
  function blurEventHandler() {
    pressedKeys = {};
  }

  /**
   * Initialize keyboard event listeners. This function must be called before using other keyboard functions.
   * @function initKeys
   */
  function initKeys() {
    let i;

    // alpha keys
    // @see https://stackoverflow.com/a/43095772/2124254
    for (i = 0; i < 26; i++) {
      // rollupjs considers this a side-effect (for now), so we'll do it
      // in the initKeys function
      keyMap['Key' + String.fromCharCode(i + 65)] = String.fromCharCode(
        i + 97
      );
    }

    // numeric keys
    for (i = 0; i < 10; i++) {
      keyMap['Digit' + i] = keyMap['Numpad' + i] = '' + i;
    }

    window.addEventListener('keydown', keydownEventHandler);
    window.addEventListener('keyup', keyupEventHandler);
    window.addEventListener('blur', blurEventHandler);
  }

  /**
   * Register a function to be called when a key is pressed. Takes a single key or an array of keys. Is passed the original [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) as a parameter.
   *
   * By default, the default action will be prevented for any bound key. To not do this, pass the `preventDefault` option.
   *
   * ```js
   * import { initKeys, onKey } from 'kontra';
   *
   * initKeys();
   *
   * onKey('p', function(e) {
   *   // pause the game
   * });
   * onKey(['enter', 'space'], function(e) {
   *   // fire gun
   * });
   * ```
   * @function onKey
   *
   * @param {String|String[]} keys - Key or keys to register.
   * @param {(evt: KeyboardEvent) => void} callback - The function to be called when the key is pressed.
   * @param {Object} [options] - Register options.
   * @param {'keydown'|'keyup'} [options.handler=keydown] - Whether to register to keydown or keyup events.
   * @param {Boolean} [options.preventDefault=true] - Call `event. preventDefault()` when the key is activated.
   */
  function onKey(
    keys,
    callback,
    { handler = 'keydown', preventDefault = true } = {}
  ) {
    let callbacks =
      handler == 'keydown' ? keydownCallbacks : keyupCallbacks;
    // pd = preventDefault
    callback._pd = preventDefault;
    // smaller than doing `Array.isArray(keys) ? keys : [keys]`
    [].concat(keys).map(key => (callbacks[key] = callback));
  }

  /**
   * Check if a key is currently pressed. Use during an `update()` function to perform actions each frame.
   *
   * ```js
   * import { Sprite, initKeys, keyPressed } from 'kontra';
   *
   * initKeys();
   *
   * let sprite = Sprite({
   *   update: function() {
   *     if (keyPressed('arrowleft')){
   *       // left arrow pressed
   *     }
   *     else if (keyPressed('arrowright')) {
   *       // right arrow pressed
   *     }
   *
   *     if (keyPressed('arrowup')) {
   *       // up arrow pressed
   *     }
   *     else if (keyPressed('arrowdown')) {
   *       // down arrow pressed
   *     }
   *   }
   * });
   * ```
   * @function keyPressed
   *
   * @param {String|String[]} keys - Key or keys to check for pressed state.
   *
   * @returns {Boolean} `true` if the key is pressed, `false` otherwise.
   */
  function keyPressed(keys) {
    return !![].concat(keys).some(key => pressedKeys[key]);
  }

  const // Sound player -- returns a AudioBufferSourceNode
      zzfxP = (...t) => { let e = zzfxX.createBufferSource(), f = zzfxX.createBuffer(t.length, t[0].length, zzfxR); t.map((d, i) => f.getChannelData(i).set(d)), e.buffer = f, e.connect(zzfxX.destination), e.start(); return e },

      // Sound generator -- returns an array of sample data
      zzfxG = (q = 1, k = .05, c = 220, e = 0, t = 0, u = .1, r = 0, F = 1, v = 0, z = 0, w = 0, A = 0, l = 0, B = 0, x = 0, G = 0, d = 0, y = 1, m = 0, C = 0) => { let b = 2 * Math.PI, H = v *= 500 * b / zzfxR ** 2, I = (0 < x ? 1 : -1) * b / 4, D = c *= (1 + 2 * k * Math.random() - k) * b / zzfxR, Z = [], g = 0, E = 0, a = 0, n = 1, J = 0, K = 0, f = 0, p, h; e = 99 + zzfxR * e; m *= zzfxR; t *= zzfxR; u *= zzfxR; d *= zzfxR; z *= 500 * b / zzfxR ** 3; x *= b / zzfxR; w *= b / zzfxR; A *= zzfxR; l = zzfxR * l | 0; for (h = e + m + t + u + d | 0; a < h; Z[a++] = f)++K % (100 * G | 0) || (f = r ? 1 < r ? 2 < r ? 3 < r ? Math.sin((g % b) ** 3) : Math.max(Math.min(Math.tan(g), 1), -1) : 1 - (2 * g / b % 2 + 2) % 2 : 1 - 4 * Math.abs(Math.round(g / b) - g / b) : Math.sin(g), f = (l ? 1 - C + C * Math.sin(2 * Math.PI * a / l) : 1) * (0 < f ? 1 : -1) * Math.abs(f) ** F * q * zzfxV * (a < e ? a / e : a < e + m ? 1 - (a - e) / m * (1 - y) : a < e + m + t ? y : a < h - d ? (h - a - d) / u * y : 0), f = d ? f / 2 + (d > a ? 0 : (a < h - d ? 1 : (h - a) / d) * Z[a - d | 0] / 2) : f), p = (c += v += z) * Math.sin(E * x - I), g += p - p * B * (1 - 1E9 * (Math.sin(a) + 1) % 2), E += p - p * B * (1 - 1E9 * (Math.sin(a) ** 2 + 1) % 2), n && ++n > A && (c += w, D += w, n = 0), !l || ++J % l || (c = D, v = H, n = n || 1); return Z },

      // Global volume
      zzfxV = 0.1,

      // Global sample rate
      zzfxR = 44100,

      // Common audio context
      zzfxX = new (window.AudioContext || webkitAudioContext),

      // ZzFXM (v2.0.3) | (C) Keith Clark | MIT | https://github.com/keithclark/ZzFXM
      zzfxM = (n, f, t, e = 125) => { let l, o, z, r, g, h, x, a, u, c, i, m, p, G, M = 0, R = [], b = [], j = [], k = 0, q = 0, s = 1, v = {}, w = zzfxR / e * 60 >> 2; for (; s; k++)R = [s = a = m = 0], t.map((e, d) => { for (x = f[e][k] || [0, 0, 0], s |= !!f[e][k], G = m + (f[e][0].length - 2 - !a) * w, p = d == t.length - 1, o = 2, r = m; o < x.length + p; a = ++o) { for (g = x[o], u = o == x.length + p - 1 && p || c != (x[0] || 0) | g | 0, z = 0; z < w && a; z++ > w - 99 && u ? i += (i < 1) / 99 : 0)h = (1 - i) * R[M++] / 2 || 0, b[r] = (b[r] || 0) - h * q + h, j[r] = (j[r++] || 0) + h * q + h; g && (i = g % 1, q = x[1] || 0, (g |= 0) && (R = v[[c = x[M = 0] || 0, g]] = v[[c, g]] || (l = [...n[c]], l[2] *= 2 ** ((g - 12) / 12), g > 0 ? zzfxG(...l) : []))); } m = G; }); return [b, j] },

      song = zzfxM(...[[[.6, 0, 124, .02, .05, .18, 3, , , , , , , , , , , , .03], [3, 0, 10, , , .2, 3, , , , , , , 3, , 1], [2.5, 0, 219, , , , 4, 1.1, , -0.1, -50, -0.05, -0.01, 2, , .1], [2.5, 0, 248, .01, .15, .15, 2, .5, , , , , 154.87, , 1.1, , .5, , , .2], [3, 0, 31, .01, .12, .25, 3, , , , , , , , , , .01], [1.6, 0, 248, .01, .15, .5, , .1, , , , , , .1, 1, , .06, 1.1, .05, .03]], [[[4, , 17, , , , , , , , 17, , 16, , 14, , , , , , , , 14, , 17, , 19, , , , , , , , 19, , 17, , 16, , , , , , 16, , 17, , 19, ,], [, , 21, , 21, , 21, , 21, , 21, , 21, , 17, , 17, , 17, , 17, , 17, , 17, , 22, , 22, , 22, , 22, , 22, , 22, , 19, , 19, , 19, , 19, , 19, , 19, ,], [, , 24, , 24, , 24, , 24, , 24, , 24, , 21, , 21, , 21, , 21, , 21, , 21, , 26, , 26, , 26, , 26, , 26, , 26, , 24, , 24, , 24, , 24, , 24, , 24, ,], [1, , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , , , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , 17, ,], [2, , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , ,], [5, , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,], [3, , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,]], [[4, , 21, , , , , , , , 19, , 21, , 22, , , , , , , , 21, , 22, , 23, , , , , , , , 22, , 23, , 24, , , , 24, , , , 24, , , ,], [, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 22, , 22, , 22, ,], [, , 24, , 24, , 24, , 24, , 24, , 24, , 25, , 25, , 25, , 25, , 25, , 25, , 26, , 26, , 26, , 26, , 26, , 26, , 28, , 28, , 28, , 28, , 28, , 28, ,], [1, , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , , , 17, , , , , , , , , , 17, , 17, , , , 17, , , , 17, , , ,], [2, , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , 29, 29], [5, , 17, , , , , , 16, , , , , , 17, , , , , , 19, , , , , , 21, , , , , , 17, , , , , , 14, , , , , , 12, , , , , ,], [3, , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,]], [[4, , 17, , , , , , , , 17, , 16, , 14, , , , , , , , 14, , 17, , 19, , , , , , , , 19, , 17, , 16, , , , , , 16, , 17, , 19, ,], [, , 21, , 21, , 21, , 21, , 21, , 21, , 17, , 17, , 17, , 17, , 17, , 17, , 22, , 22, , 22, , 22, , 22, , 22, , 19, , 19, , 19, , 19, , 19, , 19, ,], [, , 24, , 24, , 24, , 24, , 24, , 24, , 21, , 21, , 21, , 21, , 21, , 21, , 26, , 26, , 26, , 26, , 26, , 26, , 24, , 24, , 24, , 24, , 24, , 24, ,], [1, , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , , , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , 17, ,], [2, , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , ,], [5, , 17, , , , , , 12, , , , , , 9, , , , , , 17, , , , , , 14, , , , , , 17, , , , , , 16, , , , , , 12, , , , , ,], [3, , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,]], [[4, , 17, , , , , , , , 17, , 16, , 14, , , , , , , , 14, , 17, , 19, , , , , , , , 19, , 17, , 16, , , , , , 16, , 17, , 19, ,], [, , 21, , 21, , 21, , 21, , 21, , 21, , 17, , 17, , 17, , 17, , 17, , 17, , 22, , 22, , 22, , 22, , 22, , 22, , 19, , 19, , 19, , 19, , 19, , 19, ,], [, , 24, , 24, , 24, , 24, , 24, , 24, , 21, , 21, , 21, , 21, , 21, , 21, , 26, , 26, , 26, , 26, , 26, , 26, , 24, , 24, , 24, , 24, , 24, , 24, ,], [1, , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , , , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , 17, ,], [2, , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , ,], [5, , 17, , , , , , 12, , , , , , 9, , , , , , 17, , , , , , 14, , , , , , 17, , , , , , 16, , , , , , 12, , , , , ,], [3, , 33, , 29, , 31, , 26, , 29, , 24, , 26, , , , , , , , 36, , 34, , 33, , , , , , , , , , 34, , 33, , , , , , 31, , , , , ,]], [[4, , 21, , , , , , , , 19, , 21, , 22, , , , , , , , 21, , 22, , 23, , , , , , , , 22, , 23, , 24, , , , 24, , , , 24, , , ,], [, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 17, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 19, , 22, , 22, , 22, ,], [, , 24, , 24, , 24, , 24, , 24, , 24, , 25, , 25, , 25, , 25, , 25, , 25, , 26, , 26, , 26, , 26, , 26, , 26, , 28, , 28, , 28, , 28, , 28, , 28, ,], [1, , 17, , , , , , , , , , 17, , 17, , , , 17, , , , , , , , 17, , , , , , , , , , 17, , 17, , , , 17, , , , 17, , , ,], [2, , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , , , , , , , , , 29, , , , 29, 29], [5, , 17, , , , , , 16, , , , , , 17, , , , , , 19, , , , , , 21, , , , , , 17, , , , , , 14, , , , , , 12, , , , , ,], [3, , 33, , 34, , 33, , 31, , 33, , 31, , 29, , , , , , , , 31, , 33, , 31, , , , , , , , 26, , 28, , 29, , , , , , 31, , , , , ,]]], [0, 0, 2, 1, 3, 4], , { "title": "UniWop", "instruments": ["Main Piano", "Kick", "Snare", "Lead", "Bass", "Flute"], "patterns": ["Intro 1", "Main 2", "Main 1", "Lead 1", "Lead 2"] }]),

      scoop = zzfxG(...[,,120,.02,.25,.13,4,3.3,15,,20,.2,.01,.3,35,,,.58,.06,.31]);

  var audio = {
      scoop,
      song,
      zzfxP
  };

  /* eslint-disable func-style */
  /* eslint-disable new-cap */
  /* eslint-disable max-lines */
  /* eslint-disable max-params */
  /* eslint-disable no-extra-parens */
  /* eslint-disable no-mixed-operators */
  /* eslint-disable sort-vars */
  /* global window */


  const
      {
          random: rnd,
          max, min,
          hypot, sin, cos, atan2,
          floor,
          abs,
          PI
      } = Math,
      TAU = PI * 2,
      {
          canvas,
          context
      } = init$1(),
      BOUNCE_AMPLITUDE = 3,
      BOUNCE_SPEED = 10,
      BREAK_MESSAGES = ['HUNGRY CUSTOMERS INCOMING. GET READY TO SCOOP THAT POOP!', 'FRESH POOP. HUNGRY CUSTOMERS. TASTE THE RAINBOW.', 'BUSINESS IS BOOMIN’ UNICORNS ARE POOPIN’ TIME TO GET SCOOPIN’'],
      // Indices: 0 BACKGROUND, 1 CLIPBOARD, 2 CONE, 3 COUNTER_BASE, 4 COUNTER_TOP, 5 FLOOR, 6 GREY, 7 WHITE, 8 BLACK
      COLORS = [
          '#866F9B',
          '#ad9f85',
          '#DAB592',
          '#D9BCF2',
          '#F6ECFF',
          '#6C4F89',
          '#666',
          '#FFF',
          '#000'
      ],
      COUNTER_BASE_H = 30,
      COUNTER_MID_H = 30,
      COUNTER_TOP_H = 21,
      COUNTER_TOP_Y = canvas.height - (COUNTER_BASE_H + COUNTER_MID_H + COUNTER_TOP_H),
      COUNTER_Y = canvas.height - 21,
      DELIVER_R = 42,
      // Path builders for each facial expression, keyed by expression name; 'neutral' is the default fallback
      FACES = {
          annoyed (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
              ctx.moveTo(-eyeOffsetX - eyeR, eyeY - eyeR);
              ctx.lineTo(-eyeOffsetX + eyeR, eyeY - eyeR * 0.2);
              ctx.moveTo(eyeOffsetX + eyeR, eyeY - eyeR);
              ctx.lineTo(eyeOffsetX - eyeR, eyeY - eyeR * 0.2);
              ctx.moveTo(-mouthW * 0.6, mouthY);
              ctx.lineTo(mouthW * 0.6, mouthY + r * 0.25);
          },
          content (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
              ctx.moveTo(-mouthW * 0.7, mouthY - r * 0.1);
              ctx.quadraticCurveTo(0, mouthY + r * 0.15, mouthW * 0.7, mouthY - r * 0.1);
          },
          delighted (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
              ctx.arc(0, mouthY - r * 0.15, mouthW, 0.1 * PI, 0.9 * PI);
              ctx.closePath();
          },
          happy (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
              ctx.arc(0, mouthY - r * 0.25, mouthW * 0.8, 0.15 * PI, 0.85 * PI);
          },
          neutral (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY) {
              ctx.moveTo(-mouthW * 0.6, mouthY);
              ctx.lineTo(mouthW * 0.6, mouthY);
          },
          unhappy (ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r) {
              ctx.arc(0, mouthY + r * 0.35, mouthW * 0.7, 1.15 * PI, 1.85 * PI);
          }
      },
      CONTAMINATED_COLOR = ['#8B5A2B', '#4A2E12'],
      FLY_CATCH_R = 6,
      FLY_COOLDOWN = 15,
      FLY_DOT_COUNT = 7,
      FLY_HOVER_TIME = 3,
      FLY_MIN_ROUND = 3,
      FLY_SPEED = 70,
      GAME_OVER_DURATION = 12,
      INSPECTOR_CATCH_R = 24,
      INSPECTOR_COOLDOWN = 20,
      PICKUP_R = 42,
      PLAYER_MAX_Y = COUNTER_TOP_Y + 24,
      PLAYER_REACH_Y = 60,
      PLAYER_SPEED = 260,
      RAINBOW = [
          // [fill, stroke]
          ['#FAA', '#F00'],
          ['#FCA', '#FA0'],
          ['#FFA', '#FF0'],
          ['#AFA', '#080'],
          ['#AAF', '#00F'],
          ['#CAF', '#408'],
          ['#DBF', '#93E']
      ],
      SERVE_MESSAGES = ['DOO-LIVERED!', 'SCOOP THERE IT IS!'],
      SPLASH_SCOOP_COLOR = RAINBOW[floor(rnd() * RAINBOW.length)],
      SQUISH_LERP = 0.2,
      STATUS_DURATION = 6,
      STORAGE_KEY = 'js13kpoopnscoop',
      TAIL_SWING_DURATION = 0.5,
      UNICORN_Y = 110,
      UNICORNS = RAINBOW.map((color, i) => ({
          color,
          idleTimer: rnd() * 10,
          speedMult: 0.7 + rnd() * 0.6,
          squishX: 1,
          squishY: 1,
          tailSwingTimer: 0,
          x: 140 + i * 70,
          y: UNICORN_Y
      })),
      // Shared factory for UI text entries: defaults to white fill + centered anchor
      uiText = (opts) => factory$7({
          anchor: {
              x: 0.5,
              y: 0.5
          },
          color: COLORS[7],
          font: '15px monospace',
          textAlign: 'center',
          width: canvas.width - 20,
          x: canvas.width / 2,
          y: canvas.height - COUNTER_BASE_H / 2,
          ...opts
      }),
      game = {
          loop: null,
          muted: false,
          started: false,
          ui: {
              break: uiText({
                  text: BREAK_MESSAGES[0]
              }),
              over: uiText({
                  text: 'THAT’S ONE WAY TO FLUSH A CAREER! PRESS N TO SCOOP AGAIN'
              }),
              status: uiText({
                  text: ''
              })
          }
      },
      // Music controller to manage background music playback
      music = (function () {
          let player = null;

          return {
              start () {
                  if (player) {
                      player.start();
                  } else {
                      player = audio.zzfxP(...audio.song);
                      player.loop = true;
                  }
              },
              stop () {
                  if (player) {
                      player.stop();
                  }
                  player = null;
              }
          };
      }()),
      soundFx = (effect) => {
          if (audio[effect]) {
              audio.zzfxP(audio[effect]);
          }
      };

  let
      cachedGamepadIndex = -1,
      spawnTimer = 0;

  // Init gamepad and keyboard input
  initKeys();
  initGamepad();

  // Determine if the player is using a gamepad and if so, what index it is
  window.addEventListener('gamepadconnected', (evt) => {
      cachedGamepadIndex = evt.gamepad.index;
  });

  window.addEventListener('gamepaddisconnected', (evt) => {
      if (evt.gamepad.index === cachedGamepadIndex) {
          cachedGamepadIndex = -1;
      }
  });

  // Decrements entity[key] by dt, clamped at 0
  function tickDown (entity, key, dt) {
      entity[key] = max(0, entity[key] - dt);
  }

  // Fills then strokes the current path
  function fillStroke (ctx) {
      ctx.fill();
      ctx.stroke();
  }

  // Returns the current gamepad axis value, or 0 if no gamepad is connected
  function axis (name) {
      return cachedGamepadIndex >= 0 ? gamepadAxis(name, cachedGamepadIndex) : 0;
  }

  // Returns the rainbow color pair [fill, stroke] for the current round
  function roundColor () {
      return RAINBOW[(game.round - 1) % RAINBOW.length];
  }

  // Draws a rounded speech balloon with a pointer at the bottom, centered at (x, y)
  function drawBalloon (ctx, x, y, w, h) {
      const r = 8;

      ctx.beginPath();
      ctx.moveTo(x - w / 2 + r, y - h / 2);
      ctx.lineTo(x + w / 2 - r, y - h / 2);
      ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
      ctx.lineTo(x + w / 2, y + h / 2 - r);
      ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
      ctx.lineTo(6, y + h / 2);
      ctx.lineTo(x, y + h / 2 + 10);
      ctx.lineTo(-6, y + h / 2);
      ctx.lineTo(x - w / 2 + r, y + h / 2);
      ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
      ctx.lineTo(x - w / 2, y - h / 2 + r);
      ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
      ctx.closePath();
      fillStroke(ctx);
  }

  // Draws a circle at (x, y) with radius r on the given context, optionally stroking it
  function drawCircle (ctx, x, y, r, stroke) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();

      if (stroke) {
          ctx.stroke();
      }
  }

  // Draws a simple poop-emoji shape: three stacked tapering lobes with a swirl tip, filled with a single outer-border stroke (no seams between lobes)
  function drawPoop (ctx, x, y, r) {
      const drawLobes = () => {
          ctx.moveTo(x + r * 1.1, y + r * 0.9);
          ctx.ellipse(x, y + r * 0.9, r * 1.1, r * 0.55, 0, 0, TAU);
          ctx.moveTo(x + r * 0.85, y + r * 0.1);
          ctx.ellipse(x, y + r * 0.1, r * 0.85, r * 0.5, 0, 0, TAU);
          ctx.moveTo(x + r * 0.55, y - r * 0.6);
          ctx.ellipse(x, y - r * 0.6, r * 0.55, r * 0.4, 0, 0, TAU);
          ctx.moveTo(x + r * 0.15, y - r * 1.1);
          ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.3, x, y - r * 1.5);
      };

      // Wide stroke first (color's stroke, drawn thick) so only the outermost edge remains visible once the fill covers the seams
      ctx.save();
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawLobes();
      ctx.stroke();
      ctx.restore();

      // Fill on top hides the internal seam strokes, leaving only the outer border visible
      ctx.beginPath();
      drawLobes();
      ctx.fill();
  }

  // Draws a striped red/white canopy across the top of the screen, made of alternating tabs rounded at the bottom
  function drawCanopy (ctx, width, tabCount = 20, straightH = 34, roundH = 14) {
      const
          tabW = width / tabCount,
          r = tabW / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      for (let i = 0; i < tabCount; i += 1) {
          const x = i * tabW;

          ctx.fillStyle = i % 2 === 0 ? roundColor()[0] : COLORS[7];
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + tabW, 0);
          ctx.lineTo(x + tabW, straightH);
          ctx.lineTo(x + tabW, straightH + roundH - r);
          ctx.arc(x + tabW / 2, straightH + roundH - r, r, 0, PI);
          ctx.lineTo(x, straightH);
          ctx.closePath();
          ctx.fill();
      }

      ctx.restore();
  }

  // Strokes an arm path (shoulder -> elbow -> hand) using the current strokeStyle/lineWidth
  function strokeArmPath (ctx, armX, armY, elbowX, elbowY) {
      ctx.beginPath();
      ctx.moveTo(armX, armY - 7);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(armX, armY + 9);
      ctx.stroke();
  }

  // Sets fill/stroke/lineWidth
  function setColorStyle (ctx, fill, stroke) {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
  }

  // Draws a vertical stack of colored, stroked dots starting at yBase and moving up by step per entry
  function drawIceCreamScoops (ctx, colors, yBase, step, r, xBase = 0) {
      colors.forEach(([fill, stroke], i) => {
          setColorStyle(ctx, fill, stroke);
          drawCircle(ctx, xBase, yBase - i * step, r, true);
      });
  }

  // Draws simple eyes and a mouth matching an emoticon-style expression (":)", ":D", ":}", ":|", ":(")
  function drawFace (ctx, y, r, expression) {
      const
          eyeOffsetX = r * 0.4,
          eyeR = max(1, r * 0.12),
          eyeY = y - r * 0.15,
          mouthW = r * 0.45,
          mouthY = y + r * 0.25;

      ctx.fillStyle = COLORS[6];
      ctx.beginPath();
      ctx.arc(-eyeOffsetX, eyeY, eyeR, 0, TAU);
      ctx.arc(eyeOffsetX, eyeY, eyeR, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = COLORS[6];
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      (FACES[expression] || FACES.neutral)(ctx, eyeOffsetX, eyeR, eyeY, mouthW, mouthY, r);

      ctx.stroke();
  }

  // Computes shared body/head layout metrics for a person shape sized to fit within width/height
  function personLayout (width, height) {
      const headR = 12,
          bodyH = height - headR * 2,
          bodyRx = width / 2,
          bodyRy = bodyH / 2,
          headOverlap = 8,
          bodyCenterY = height / 2 - bodyRy,
          headCenterY = bodyCenterY - bodyRy - headR + headOverlap;

      return {
          bodyCenterY,
          bodyRx,
          bodyRy,
          headCenterY,
          headR
      };
  }

  // Draws a person shape (oval body + circle head) sized to fit within width/height, returns head position for further drawing
  function drawPerson (ctx, width, height, color, stroke, expression) {
      const
          {
              bodyCenterY,
              bodyRx,
              bodyRy,
              headCenterY,
              headR
          } = personLayout(width, height);

      setColorStyle(ctx, color, stroke);

      ctx.beginPath();
      ctx.ellipse(0, bodyCenterY, bodyRx, bodyRy, 0, 0, TAU);
      fillStroke(ctx);

      ctx.beginPath();
      ctx.arc(0, headCenterY, headR, 0, TAU);
      fillStroke(ctx);

      drawFace(ctx, headCenterY, headR, expression);

      return {
          headCenterY,
          headR
      };
  }

  // Draws a triangle from three points on the given context, optionally stroking it
  function drawTriangle (ctx, x1, y1, x2, y2, x3, y3, stroke) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();

      {
          ctx.stroke();
      }
  }

  // Draws a simple fez (wide at the base, narrower at the top, flat top, with a tassel)
  function drawSodaJerkHat (ctx, headCenterY, headR) {
      const
          baseW = headR * 1.6,
          hatH = headR * 0.9,
          hatTopY = headCenterY - headR - hatH,
          hatY = headCenterY - headR,
          topW = headR * 1.1;

      setColorStyle(ctx, COLORS[7], COLORS[6]);

      ctx.beginPath();
      ctx.moveTo(-baseW / 2, hatY);
      ctx.lineTo(-topW / 2, hatTopY);
      ctx.lineTo(topW / 2, hatTopY);
      ctx.lineTo(baseW / 2, hatY);
      ctx.closePath();
      fillStroke(ctx);

      ctx.strokeStyle = roundColor()[1];
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(-baseW / 2, hatY);
      ctx.quadraticCurveTo(0, (hatY + hatTopY) / 2, 0, hatTopY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(baseW / 2, hatY);
      ctx.quadraticCurveTo(0, (hatY + hatTopY) / 2, 0, hatTopY);
      ctx.stroke();
  }

  // Draws a bow tie (two triangles + a center knot) just below the head
  function drawBowTie (ctx, headCenterY, headR) {
      const
          color = roundColor(),
          knotR = headR * 0.15 + 1,
          tieH = headR * 0.75,
          tieW = headR * 0.6,
          tieY = headCenterY + headR * 1.1;

      setColorStyle(ctx, color[0], color[1]);

      drawTriangle(ctx, -knotR, tieY, -knotR - tieW, tieY - tieH / 2, -knotR - tieW, tieY + tieH / 2);
      drawTriangle(ctx, knotR, tieY, knotR + tieW, tieY - tieH / 2, knotR + tieW, tieY + tieH / 2);

      ctx.fillStyle = color[1];
      ctx.beginPath();
      ctx.arc(0, tieY, knotR, 0, TAU);
      ctx.fill();
  }

  // Returns a fresh copy of the initial round/game state
  function initialState () {
      return {
          breakTimer: 0,
          carrying: [],
          colorBag: [],
          customers: [],
          elapsed: 0,
          flies: null,
          flyCooldown: FLY_COOLDOWN,
          inspector: null,
          inspectorCooldown: 0,
          maxAtOnce: 3,
          newBest: false,
          onBreak: false,
          over: false,
          overTimer: 0,
          receipt: {
              items: [],
              scroll: 0
          },
          round: 1,
          roundColor: RAINBOW[0],
          score: 0,
          served: 0,
          spills: [],
          statusTimer: 0,
          target: 7
      };
  }

  // Reads the stored high score, updates it if beaten, and refreshes the UI text
  function updateHighScore () {
      const stored = getStoreItem(STORAGE_KEY) || 0;

      if (game.score > stored) {
          setStoreItem(STORAGE_KEY, game.score);
          game.newBest = true;
      }
  }

  // Clamps score to a minimum of 0, updates the score UI text, and refreshes the high score
  function setScore (value) {
      game.score = max(0, value);
      updateHighScore();
  }

  /*
   * Pushes a new charge/credit line onto the receipt; color is derived from the sign of the amount.
   * Only keeps enough history to cover the visible list (plus one for the slide-in animation), since older
   * entries scroll permanently off-screen and are never shown again.
   */
  function addReceiptItem (label, amount) {
      const
          rowH = 18,
          listH = canvas.height * 0.6 - 24 - 16,
          maxItems = Math.ceil(listH / rowH) + 1;

      game.receipt.items.push({
          amount,
          color: amount >= 0 ? RAINBOW[3][1] : RAINBOW[0][1],
          label
      });

      if (game.receipt.items.length > maxItems) {
          game.receipt.items.shift();
      }

      game.receipt.scroll = rowH;
  }

  // Draws the scrolling receipt panel flush to the top-right of the screen
  function renderReceipt (ctx) {
      const
          r = game.receipt,
          w = canvas.width / 4,
          h = canvas.height * 0.6,
          x = canvas.width - w,
          y = 0,
          pad = 8,
          rowH = 18,
          totalH = 36,
          tearCount = 10,
          tearH = 6,
          tearW = (canvas.width / 4) / tearCount,
          lineY = y + h - totalH,
          listTop = y + pad,
          listH = lineY - listTop - pad,
          listBottom = listTop + listH;

      r.scroll += (0 - r.scroll) * 0.25;

      ctx.save();
      ctx.fillStyle = COLORS[7];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - tearH);

      for (let i = 0; i < tearCount; i += 1) {
          const segX = x + w - i * tearW;

          ctx.lineTo(segX - tearW / 2, y + h);
          ctx.lineTo(segX - tearW, y + h - tearH);
      }

      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, listTop, w, listH);
      ctx.clip();

      ctx.font = '12px monospace';
      ctx.textBaseline = 'middle';

      r.items.forEach((item, i) => {
          const itemY = listBottom - (r.items.length - 1 - i) * rowH - rowH / 2 + r.scroll;

          if (itemY >= listTop - rowH && itemY <= listBottom + rowH) {
              ctx.fillStyle = item.color;
              ctx.textAlign = 'left';
              ctx.fillText(item.label, x + pad, itemY);
              ctx.textAlign = 'right';
              ctx.fillText(`${item.amount >= 0 ? '+' : '-'}$${abs(item.amount)}`, x + w - pad, itemY);
          }
      });

      ctx.restore();

      ctx.strokeStyle = COLORS[8];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + pad, lineY);
      ctx.lineTo(x + w - pad, lineY);
      ctx.stroke();

      ctx.fillStyle = COLORS[5];
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL', x + pad, lineY + pad + 6);

      if (game.newBest) {
          ctx.textAlign = 'center';
          ctx.fillText('NEW BEST', x + w / 2, lineY + pad + 6);
      }

      ctx.textAlign = 'right';
      ctx.fillText(`$${game.score}`, x + w - pad, lineY + pad + 6);
      ctx.restore();
  }

  // Draws the soda shop / ice cream parlor letterboard splash screen
  function renderSplashBoard (ctx) {
      const
          best = max(getStoreItem(STORAGE_KEY) || 0, game.score),
          boardW = canvas.width * 0.6,
          padX = 18,
          rowH = 12,
          fontColor = RAINBOW[5][1],
          slotColor = RAINBOW[6][0],
          lines = [
              ['', ''],
              ['', ''],
              ['', ''],
              ['', ''],
              ['', ''],
              ['', ''],
              ['', ''],
              ['', ''],
              ['MENU', ''],
              ['', ''],
              ['', ''],
              ['1 SCOOP', '$3', '1'],
              ['', ''],
              ['2 SCOOPS', '$5', '2'],
              ['', ''],
              ['3 SCOOPS', '$7', '3'],
              ['', ''],
              ['', ''],
              ['BEST', `$${best}`],
              ['', ''],
              ['', ''],
              ['PRESS N TO START SCOOPIN’', '', 'N'],
              ['', ''],
              ['', '']
          ],
          HEADER_ROWS = 6,
          boardH = lines.length * rowH,
          boardX = (canvas.width - boardW) / 2,
          boardY = (canvas.height - boardH) / 2,
          headerCenterY = boardY + (rowH * HEADER_ROWS) / 2,
          titleText = 'Poop n’ Scoop',
          titleX = boardX + padX,
          titleWidth = ctx.measureText(titleText).width,
          titleGradient = ctx.createLinearGradient(titleX, 0, titleX + titleWidth, 0),
          coneOffsetY = 30,
          coneTipY = boardY + rowH * HEADER_ROWS,
          frameTopY = boardY - 3,
          coneH = (coneTipY - frameTopY) * 1.8,
          coneW = coneH * 0.28,
          coneTopY = coneTipY - coneH,
          coneX = boardX + boardW - padX - coneW,
          scoopR = coneW,
          coneCenterY = (coneTopY + coneTipY) / 2;
      let rowY = boardY + rowH / 2;

      // Shadow rectangle, offset for depth
      ctx.fillStyle = COLORS[5];
      ctx.fillRect(boardX - 3 + 6, boardY - 3 + 6, boardW + 6, boardH + 6);

      // Board frame
      ctx.fillStyle = fontColor;
      ctx.fillRect(boardX - 3, boardY - 3, boardW + 6, boardH + 6);
      ctx.fillStyle = COLORS[7];
      ctx.fillRect(boardX, boardY, boardW, boardH);

      // Header block behind the title area
      ctx.fillStyle = fontColor;
      ctx.fillRect(boardX, boardY, boardW, rowH * HEADER_ROWS);

      // Title text inside the header block, left side, opposite the cone
      ctx.font = 'small-caps bold 36px cursive';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      RAINBOW.forEach((c, idx) => {
          titleGradient.addColorStop(idx / (RAINBOW.length - 1), c[0]);
      });

      ctx.fillStyle = titleGradient;
      ctx.fillText(titleText, titleX, headerCenterY);

      // Ice cream cone with a scoop, in the top-right of the header, poking 1/3 of its length above the frame
      ctx.save();
      ctx.translate(coneX, coneCenterY + coneOffsetY);
      ctx.rotate(PI / 6);

      ctx.fillStyle = COLORS[2];
      ctx.beginPath();
      ctx.moveTo(-coneW, coneTopY - coneCenterY);
      ctx.lineTo(coneW, coneTopY - coneCenterY);
      ctx.lineTo(0, coneTipY - coneCenterY);
      ctx.closePath();
      ctx.fill();

      // Scoop sitting on top of the cone
      ctx.fillStyle = SPLASH_SCOOP_COLOR[0];
      ctx.beginPath();
      ctx.arc(0, coneTopY - coneCenterY, scoopR, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = SPLASH_SCOOP_COLOR[1];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = fontColor;
      ctx.font = '18px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = slotColor;
      ctx.lineWidth = 1;

      lines.forEach(([label, price, highlight], i) => {
          // Slot line above this row (skip inside the header block)
          if (i >= HEADER_ROWS) {
              ctx.beginPath();
              ctx.moveTo(boardX, Math.floor(rowY - rowH / 2) + 0.5);
              ctx.lineTo(boardX + boardW, Math.floor(rowY - rowH / 2) + 0.5);
              ctx.stroke();
          }

          const labelColor = i < HEADER_ROWS ? COLORS[7] : fontColor;

          ctx.textAlign = 'left';

          if (highlight) {
              const
                  idx = label.indexOf(highlight),
                  before = label.slice(0, idx),
                  after = label.slice(idx + 1);
              let x = boardX + padX;

              ctx.fillStyle = labelColor;
              ctx.fillText(before, x, rowY);
              x += ctx.measureText(before).width;

              ctx.fillStyle = RAINBOW[0][1];
              ctx.fillText(highlight, x, rowY);
              x += ctx.measureText(highlight).width;

              ctx.fillStyle = labelColor;
              ctx.fillText(after, x, rowY);
          } else {
              ctx.fillStyle = labelColor;
              ctx.fillText(label, boardX + padX, rowY);
          }

          if (price) {
              ctx.fillStyle = RAINBOW[0][1];
              ctx.textAlign = 'right';
              ctx.fillText(price, boardX + boardW - padX, rowY);
          }

          rowY += rowH;
      });

      // Slot line below the final row
      ctx.beginPath();
      ctx.moveTo(boardX, Math.floor(rowY - rowH / 2) + 0.5);
      ctx.lineTo(boardX + boardW, Math.floor(rowY - rowH / 2) + 0.5);
      ctx.stroke();
  }

  // Advances/decays a paused-vs-moving timer on an entity, toggling `paused` and picking a new random duration
  function tickPauseTimer (entity, dt, pausedMin, pausedRange, moveMin, moveRange) {
      entity.moveTimer -= dt;

      if (entity.moveTimer <= 0) {
          entity.paused = !entity.paused;
          entity.moveTimer = entity.paused
              ? pausedMin + rnd() * pausedRange
              : moveMin + rnd() * moveRange;
      }
  }

  // Advances an entity's idle timer and lerps its squishX/squishY toward a sinusoidal jiggle
  function updateSquish (entity, dt, amp, speedMult = 1) {
      entity.idleTimer += dt;

      const jiggle = sin(entity.idleTimer * BOUNCE_SPEED * speedMult) * amp;

      entity.squishX += (1 - jiggle - entity.squishX) * SQUISH_LERP;
      entity.squishY += (1 + jiggle - entity.squishY) * SQUISH_LERP;
  }

  function advanceRound () {
      game.round += 1;
      game.served = 0;
      game.target = min(game.round * 7, 70);

      game.maxAtOnce = min(3 + (game.round - 1) * 2, 14);

      game.customers = [];
      game.inspector = null;
      game.inspectorCooldown = INSPECTOR_COOLDOWN;
      game.onBreak = true;
      game.breakTimer = 7;
      game.roundColor = roundColor();
      game.ui.break.text = BREAK_MESSAGES[floor(rnd() * BREAK_MESSAGES.length)];
  }

  function dist (a, b) {
      return hypot(a.x - b.x, a.y - b.y);
  }

  // Returns true if a box of size (2*halfW x 2*halfH), swept from a to b, ever overlaps point p
  function sweptBoxHitsPoint (p, a, b, halfW, halfH) {
      const
          x0 = a.x - p.x,
          y0 = a.y - p.y,
          dx = (b.x - p.x) - x0,
          dy = (b.y - p.y) - y0;

      let tMin = 0,
          tMax = 1;

      if (dx === 0) {
          if (x0 < -halfW || x0 > halfW) {
              return false;
          }
      } else {
          let tx1 = (-halfW - x0) / dx,
              tx2 = (halfW - x0) / dx;

          if (tx1 > tx2) {
              [tx1, tx2] = [tx2, tx1];
          }

          tMin = max(tMin, tx1);
          tMax = min(tMax, tx2);

          if (tMin > tMax) {
              return false;
          }
      }

      if (dy === 0) {
          if (y0 < -halfH || y0 > halfH) {
              return false;
          }
      } else {
          let ty1 = (-halfH - y0) / dy,
              ty2 = (halfH - y0) / dy;

          if (ty1 > ty2) {
              [ty1, ty2] = [ty2, ty1];
          }

          tMin = max(tMin, ty1);
          tMax = min(tMax, ty2);

          if (tMin > tMax) {
              return false;
          }
      }

      return tMin <= tMax;
  }

  // Shows a temporary status message in the same position as the break/game-over text
  function showStatus(text) {
      game.ui.status.text = text;
      game.statusTimer = STATUS_DURATION;
  }


  // Dumps one carried scoop at a time, charging $1 per scoop (clamped at 0)
  function dumpScoop () {
      if (game.over || !game.carrying.length) {
          return;
      }

      game.spills.push({
          color: game.carrying.pop(),
          visits: 0,
          x: game.player.x,
          y: game.player.y
      });
      setScore(game.score - 1);
      addReceiptItem('Dropped Scoop', -1);
      showStatus('SCOOP HAPPENS.');
  }

  // Resets the game state and starts a new game loop
  function resetGame () {
      Object.assign(game, initialState());
      spawnTimer = 0;
      game.player.x = canvas.width / 2;
      game.player.y = (UNICORN_Y + COUNTER_Y) / 2;
      updateHighScore();
  }

  // Starts the game on first press, or restarts it from the beginning after game over
  function restart () {
      if (!game.started) {
          game.started = true;
          if (!game.muted) {
              music.start();
          }
      } else if (game.over) {
          resetGame();
      }
  }

  // Returns n unique random colors from the palette (no repeats within an order)
  function pickWantColors (n) {
      const
          colors = [],
          pool = [...RAINBOW];

      for (let i = 0; i < n; i += 1) {
          const idx = floor(rnd() * pool.length);

          colors.push(pool.splice(idx, 1)[0]);
      }

      return colors;
  }

  // Determines how many scoops a new customer wants based on the current round
  function rollScoopCount () {
      if (game.round === 1) {
          return 1;
      }

      if (game.round === 2) {
          return 1 + floor(rnd() * 2);
      }

      return 1 + floor(rnd() * 3);
  }

  // Returns true if two color arrays match exactly, including order
  function sameColors (a, b) {
      if (a.length !== b.length) {
          return false;
      }

      return a.every((c, i) => c === b[i]);
  }

  /*
   * Customer walking speed tuning:
   * - Base speed: random between BASE_MIN and BASE_MIN + BASE_RANGE px/sec.
   * - multiplier: grows 10% per round past round 1, capped at round 10 (max +100%).
   *   Adjust the 0.1 step to change ramp-up rate per round.
   *   Adjust min(..., 9) to change the round at which speed scaling caps.
   */
  function spawnCustomer () {
      const
          height = 60 + rnd() * 18,
          multiplier = 1 + 0.1 * min(game.round - 1, 9),
          speed = (35 + rnd() * 20) * multiplier,
          wants = pickWantColors(rollScoopCount());

      game.customers.push(factory$8({
          anchor: {
              x: 0.5,
              y: 0.5
          },
          annoyedTimer: 0,
          bouncePhase: 0,
          color: COLORS[7],
          dx: -speed,
          height,
          moveTimer: 0.5 + rnd(),
          paused: false,
          render () {
              const progress = ((canvas.width + 20) - this.x) / (canvas.width + 40);

              this.context.save();
              this.context.translate(0, -abs(sin(this.bouncePhase)) * BOUNCE_AMPLITUDE);
              // eslint-disable-next-line no-nested-ternary
              drawPerson(this.context, this.width, this.height, this.color, COLORS[6], this.annoyedTimer > 0 ? 'annoyed' : progress < 0.33 ? 'content' : progress < 0.66 ? 'neutral' : 'unhappy');

              // Draw a word balloon above the customer showing their desired flavor(s)
              // eslint-disable-next-line one-var
              const
                  ballR = 6,
                  balloonW = 28,
                  gap = 6,
                  orderColors = this.want,
                  padding = 10,
                  spacing = 16,
                  balloonH = padding * 2 + (orderColors.length - 1) * spacing,
                  balloonY = -this.height / 2 - gap - balloonH / 2;

              setColorStyle(this.context, COLORS[7], COLORS[6]);
              drawBalloon(this.context, 0, balloonY, balloonW, balloonH);

              drawIceCreamScoops(this.context, orderColors, balloonY + balloonH / 2 - padding, spacing, ballR);
              this.context.restore();
          },
          served: false,
          want: wants,
          width: 26,
          x: canvas.width + 20,
          y: COUNTER_Y
      }));
  }

  // Toggles background music on/off, preserving playback position when unmuted later
  function toggleMute () {
      game.muted = !game.muted;

      if (game.muted) {
          music.stop();
      } else if (game.started) {
          music.start();
      }
  }

  function tryAction () {
      if (game.over) {
          return;
      }

      if (game.carrying.length) {
          const
              target = game.customers.find((c) => !c.served && sameColors(c.want, game.carrying) && dist(game.player, c) < DELIVER_R),
              wrongTarget = game.customers.find((c) => !c.served && dist(game.player, c) < DELIVER_R);

          if (target) {
              const
                  progress = ((canvas.width + 20) - target.x) / (canvas.width + 40),
                  isHappy = target.annoyedTimer <= 0 && progress < 0.33,
                  count = game.carrying.length,
                  base = {
                      1: 3,
                      2: 6,
                      3: 9
                  }[count] || 0,
                  tip = isHappy ? 1 : 0,
                  payout = base + tip;

              target.served = true;
              game.carrying = [];
              game.player.deliverTimer = 2.5;
              game.served += 1;
              setScore(game.score + payout);
              addReceiptItem(`${count} scoop${count > 1 ? 's' : ''}`, base);

              if (tip) {
                  addReceiptItem('Tip :)', tip);
              }

              showStatus((tip ? 'CHA-CHING! ' : '') + SERVE_MESSAGES[floor(rnd() * SERVE_MESSAGES.length)]);

              if (game.served >= game.target) {
                  advanceRound();
              }

              return;
          }

          if (wrongTarget) {
              wrongTarget.annoyedTimer = 2.5;
          }
      }

      const unicorn = UNICORNS.find((u) => dist({
          x: game.player.x,
          y: game.player.y - PLAYER_REACH_Y
      }, u) < PICKUP_R);

      if (unicorn && game.carrying.length < 3) {
          game.carrying.push(unicorn.color);
          unicorn.tailSwingTimer = TAIL_SWING_DURATION;
          soundFx('scoop');
      }
  }

  /*
   * Health inspector mechanic tuning:
   * - Only spawns from round 2 onward (game.round > 1).
   * - After appearing (or after the round starts), waits INSPECTOR_COOLDOWN
   *   seconds before it's allowed to appear again.
   * - Random appearance: each frame there's a small chance to trigger once
   *   cooldown has expired, so appearance timing within the round is unpredictable.
   * - Zig-zags top-to-bottom across the screen, bouncing between the same
   *   y bounds the player is clamped to, reversing horizontal direction once
   *   it reaches the far side and exiting only after the return trip.
   * - Uses the same pause/resume walking pattern as customers.
   */
  function trySpawnInspector (dt) {
      if (game.round <= 1 || game.inspector) {
          return;
      }

      if (game.inspectorCooldown > 0) {
          game.inspectorCooldown -= dt;

          return;
      }

      // Small per-frame chance to appear once cooldown has expired; more likely if scoops are on the floor
      if (rnd() < 0.01 + game.spills.length * 0.01) {
          game.inspector = factory$8({
              anchor: {
                  x: 0.5,
                  y: 0.5
              },
              annoyedTimer: 0,
              baseSpeed: 110,
              dirX: 1,
              height: 72,
              moveTimer: 0.5 + rnd(),
              paused: false,
              render () {
                  const {
                          headCenterY,
                          headR
                      } = drawPerson(this.context, this.width, this.height, COLORS[7], COLORS[6], this.annoyedTimer > 0 ? 'annoyed' : 'neutral'),
                      ctx = this.context,
                      {
                          bodyRx,
                          bodyRy
                      } = personLayout(this.width, this.height),
                      bodyCenterY = headCenterY + headR + bodyRy - 8,
                      armX = -bodyRx * 0.7 * this.dirX,
                      armY = bodyCenterY - bodyRy * 0.15 - 4,
                      elbowX = armX - 11 * this.dirX,
                      elbowY = armY + 10;

                  // Clipboard drawn on its side and centered on the elbow, mirrored to face the direction of travel
                  ctx.save();
                  ctx.translate(elbowX + 4 * this.dirX, elbowY - 4);
                  ctx.rotate(0.15 * this.dirX);
                  setColorStyle(ctx, COLORS[1], COLORS[6]);
                  ctx.fillRect(-9, -5, 18, 10);
                  ctx.strokeRect(-9, -5, 18, 10);
                  ctx.restore();

                  // Arm drawn last so the clipboard can appear tucked over it
                  ctx.lineJoin = 'round';
                  ctx.strokeStyle = COLORS[6];
                  ctx.lineWidth = 5;
                  strokeArmPath(ctx, armX, armY, elbowX, elbowY);

                  ctx.strokeStyle = COLORS[7];
                  ctx.lineWidth = 3;
                  strokeArmPath(ctx, armX, armY, elbowX, elbowY);
              },
              vSpeed: 80 + rnd() * 60,
              width: 26,
              x: -20,
              y: rnd() < 0.5 ? UNICORN_Y + PLAYER_REACH_Y : PLAYER_MAX_Y,
              yDir: rnd() < 0.5 ? 1 : -1
          });
          showStatus('IT’S THE HEALTH INSPECTOR! EVERYONE ACT NORMAL');
      }
  }

  /*
   * Fly swarm mechanic tuning:
   * - Only spawns from round FLY_MIN_ROUND onward, and only while there are spills on the floor.
   * - Enters from the right edge and flies toward the nearest un-visited spill, hovering/buzzing
   *   over it for FLY_HOVER_TIME seconds before moving on to the next one.
   * - Movement uses layered sine/cosine jitter on top of a straight-line heading for an erratic,
   *   buzzing flight path.
   * - Touching the swarm while carrying scoops contaminates the top (last-picked) scoop.
   */
  function trySpawnFlies (dt) {
      if (game.round < FLY_MIN_ROUND || game.flies || !game.spills.length) {
          return;
      }

      if (game.flyCooldown > 0) {
          game.flyCooldown -= dt;

          return;
      }

      if (rnd() < 0.005) {
          game.flies = {
              dots: Array.from({
                  length: FLY_DOT_COUNT
              }, () => ({
                  phase: rnd() * PI * 2,
                  r: 6 + rnd() * 10,
                  speed: 4 + rnd() * 4
              })),
              hoverTimer: 0,
              jitterPhase: rnd() * PI * 2,
              target: null,
              visited: [],
              x: canvas.width + 20,
              y: UNICORN_Y + PLAYER_REACH_Y + rnd() * (PLAYER_MAX_Y - (UNICORN_Y + PLAYER_REACH_Y))
          };

          game.flies.radius = max(...game.flies.dots.map((d) => d.r));
          showStatus('OH CRAP. WE’VE GOT FLIES!');
      }
  }

  // Setup controls: pairs of [key, gamepad button, handler]
  [['n', 'start', restart], ['space', 'south', tryAction], ['x', 'west', dumpScoop], ['m', 'north', toggleMute]].forEach(([key, pad, fn]) => {
      onKey(key, fn);
      onGamepad(pad, fn);
  });

  // Resets the game state and starts a new round
  Object.assign(game, initialState());
  updateHighScore();

  // Create the player sprite
  game.player = factory$8({
      anchor: {
          x: 0.5,
          y: 0.5
      },
      color: COLORS[7],
      deliverTimer: 0,
      height: 72,
      idleTimer: 0,
      render () {
          const bounceY = this.idleTimer ? sin(this.idleTimer * BOUNCE_SPEED) * BOUNCE_AMPLITUDE : 0;

          this.context.save();
          this.context.translate(0, bounceY);
          this.context.scale(this.squishX, this.squishY);

          // eslint-disable-next-line one-var
          const {
              headCenterY,
              headR
          } = drawPerson(this.context, this.width, this.height, this.color, COLORS[6], this.deliverTimer > 0 ? 'delighted' : 'happy');

          drawSodaJerkHat(this.context, headCenterY, headR);
          drawBowTie(this.context, headCenterY, headR);

          if (game.carrying.length) {
              const
                  coneGap = 10,
                  coneH = 22,
                  coneW = 8,
                  coneX = this.width / 2 + 12,
                  coneY = headCenterY + headR + coneGap + coneH - 6;

              this.context.fillStyle = COLORS[2];
              this.context.beginPath();
              this.context.moveTo(coneX - coneW, coneY - coneH);
              this.context.lineTo(coneX + coneW, coneY - coneH);
              this.context.lineTo(coneX, coneY);
              this.context.closePath();
              this.context.fill();

              drawIceCreamScoops(this.context, game.carrying, coneY - coneH - 6, 14, 8, coneX);
          }

          this.context.restore();
      },
      squishX: 1,
      squishY: 1,
      width: 26,
      x: canvas.width / 2,
      y: (UNICORN_Y + COUNTER_Y) / 2
  });

  // Start the game loop
  game.loop = GameLoop({
      render () {
          if (!game.started) {
              renderSplashBoard(context);

              return;
          }
          context.fillStyle = COLORS[0];
          context.fillRect(0, 0, canvas.width, canvas.height);
          renderReceipt(context);
          drawCanopy(context, canvas.width);

          // Draw dumped scoops left behind on the floor
          game.spills.forEach((s) => {
              setColorStyle(context, ...s.color);
              drawPoop(context, s.x, s.y, 6);
          });

          // Draw the fly swarm as a cluster of buzzing black dots
          if (game.flies) {
              const swarm = game.flies;

              context.fillStyle = COLORS[8];
              swarm.dots.forEach((d) => {
                  const angle = swarm.jitterPhase * d.speed + d.phase;

                  drawCircle(context, swarm.x + cos(angle) * d.r, swarm.y + sin(angle) * d.r * 0.6, 1.6);
              });
          }

          // Draw the unicorns
          UNICORNS.forEach((u) => {
              const
                  bodyRx = 24,
                  bodyRy = 16,
                  headBottomY = u.y - 6,
                  headTopY = u.y - 40,
                  headW1 = 14,
                  headW2 = 8,
                  headX = u.x,
                  eyeR = 2,
                  eyeX = headX + 3.3,
                  eyeY = headTopY + (headBottomY - headTopY) * 0.3,
                  muzzleBaseW = 12,
                  muzzleTipW = 9,
                  muzzleH = 21,
                  muzzleX = headX + headW1 / 2 - 6,
                  muzzleY = headTopY + (headBottomY - headTopY) * 0.18,
                  r = 3;

              context.save();
              context.translate(u.x, u.y);
              context.scale(u.squishX, u.squishY);
              context.translate(-u.x, -u.y);

              // Head (rectangle that narrows toward the top, rounded corners, centered) - drawn first so muzzle can overlay its edge seamlessly
              setColorStyle(context, COLORS[7], COLORS[3]);
              context.beginPath();
              context.moveTo(headX - headW1 / 2, headBottomY);
              context.lineTo(headX + headW1 / 2, headBottomY);
              context.lineTo(headX + headW2 / 2 + r, headTopY + r);
              context.quadraticCurveTo(headX + headW2 / 2, headTopY, headX + headW2 / 2 - r, headTopY);
              context.lineTo(headX - headW2 / 2 + r, headTopY);
              context.quadraticCurveTo(headX - headW2 / 2, headTopY, headX - headW2 / 2 - r, headTopY + r);
              context.closePath();
              fillStroke(context);

              // Muzzle (small rectangle tilted so its right edge slopes down, drawn on top of the head with no stroke so it merges seamlessly)
              context.fillStyle = COLORS[7];
              context.save();
              context.translate(muzzleX, muzzleY);
              context.rotate(-PI / 4);
              context.beginPath();
              context.moveTo(-muzzleBaseW / 2 + r, 0);
              context.lineTo(muzzleBaseW / 2 - r, 0);
              context.quadraticCurveTo(muzzleBaseW / 2, 0, muzzleBaseW / 2, r);
              context.lineTo(muzzleTipW / 2, muzzleH - r);
              context.quadraticCurveTo(muzzleTipW / 2, muzzleH, muzzleTipW / 2 - r, muzzleH);
              context.lineTo(-muzzleTipW / 2 + r, muzzleH);
              context.quadraticCurveTo(-muzzleTipW / 2, muzzleH, -muzzleTipW / 2, muzzleH - r);
              context.lineTo(-muzzleBaseW / 2, r);
              context.quadraticCurveTo(-muzzleBaseW / 2, 0, -muzzleBaseW / 2 + r, 0);
              context.closePath();
              context.fill();
              context.restore();

              // Eye (simple filled circle normally; squints to an X while the tail swing animation is active, i.e. when carrying a scoop)
              if (u.tailSwingTimer > 0) {
                  context.strokeStyle = COLORS[6];
                  context.lineWidth = 1;
                  context.beginPath();
                  context.moveTo(eyeX - eyeR, eyeY - eyeR);
                  context.lineTo(eyeX + eyeR, eyeY);
                  context.lineTo(eyeX - eyeR, eyeY + eyeR);
                  context.stroke();
              } else {
                  context.fillStyle = COLORS[6];
                  context.beginPath();
                  context.arc(eyeX, eyeY, eyeR, 0, TAU);
                  context.fill();
              }

              // Body (oval)
              setColorStyle(context, COLORS[7], COLORS[3]);
              context.beginPath();
              context.ellipse(u.x, u.y, bodyRx, bodyRy, 0, 0, TAU);
              fillStroke(context);

              // Horn (centered on top of the head, narrower and lowered slightly)
              setColorStyle(context, ...u.color);
              drawTriangle(context, headX - 3, headTopY + 4, headX + 3, headTopY + 4, headX, headTopY - 16);

              // Tail (curved teardrop shape, tip starting at the center of the body oval; swings out when a scoop is picked up)
              context.save();
              context.translate(u.x, u.y);
              context.rotate(-(PI / 2) * (u.tailSwingTimer / TAIL_SWING_DURATION));
              context.lineWidth = 1.12;
              context.lineCap = 'round';
              context.strokeStyle = u.color[1];
              context.fillStyle = u.color[0];
              context.beginPath();
              context.moveTo(-0.02, -1.32);
              context.bezierCurveTo(-0.02, -1.32, -0.12, -1.02, -0.12, -1.02);
              context.bezierCurveTo(-0.07, -1.57, 0.20, -2.24, 0.41, -2.6);
              context.bezierCurveTo(0.88, -3.37, 2.28, -4.99, 3.03, -5.61);
              context.bezierCurveTo(3.79, -6.22, 5.63, -7.24, 6.52, -7.52);
              context.bezierCurveTo(7.39, -7.79, 9.13, -7.97, 10.41, -7.91);
              context.bezierCurveTo(10.95, -7.88, 11.68, -7.77, 12.31, -7.61);
              context.bezierCurveTo(12.83, -7.47, 13.94, -7.04, 14.21, -6.88);
              context.bezierCurveTo(14.87, -6.5, 16.63, -5, 17.34, -4.17);
              context.bezierCurveTo(17.94, -3.46, 19.12, -1.62, 19.65, -0.6);
              context.bezierCurveTo(20.13, 0.35, 20.80, 2.14, 21.05, 3.30);
              context.bezierCurveTo(21.25, 4.23, 21.46, 6.28, 21.50, 7.58);
              context.bezierCurveTo(21.52, 8.55, 21.42, 10.46, 21.25, 11.75);
              context.bezierCurveTo(21.10, 12.81, 20.64, 14.73, 20.36, 15.86);
              context.bezierCurveTo(19.38, 19.64, 18.78, 22.36, 18.67, 23.85);
              context.bezierCurveTo(18.60, 24.84, 18.66, 26.90, 18.91, 27.65);
              context.bezierCurveTo(19.02, 28.00, 19.43, 28.72, 19.65, 28.98);
              context.bezierCurveTo(19.88, 29.23, 20.43, 29.61, 20.73, 29.72);
              context.bezierCurveTo(21.04, 29.82, 21.69, 29.84, 22.06, 29.76);
              context.bezierCurveTo(22.36, 29.70, 23.15, 29.42, 23.50, 29.20);
              context.bezierCurveTo(24.22, 28.76, 25.36, 27.76, 25.72, 27.49);
              context.bezierCurveTo(25.87, 27.69, 25.93, 28.68, 25.96, 29.25);
              context.bezierCurveTo(26.04, 30.73, 25.99, 32.27, 25.90, 33.01);
              context.bezierCurveTo(25.84, 33.51, 25.61, 34.44, 25.50, 34.75);
              context.bezierCurveTo(25.36, 35.15, 24.93, 35.96, 24.66, 36.33);
              context.bezierCurveTo(24.39, 36.70, 23.75, 37.35, 23.38, 37.65);
              context.bezierCurveTo(22.99, 37.95, 22.12, 38.46, 21.65, 38.66);
              context.bezierCurveTo(20.88, 38.97, 19.09, 39.34, 18.39, 39.33);
              context.bezierCurveTo(17.68, 38.95, 15.98, 38.63, 15.16, 38.63);
              context.bezierCurveTo(14.34, 38.31, 12.70, 37.28, 12.00, 36.64);
              context.bezierCurveTo(11.30, 36.01, 10.08, 34.50, 9.49, 33.57);
              context.bezierCurveTo(8.93, 32.66, 8.14, 30.94, 7.84, 29.95);
              context.bezierCurveTo(7.59, 29.10, 7.20, 27.18, 7.08, 26.28);
              context.bezierCurveTo(6.97, 25.33, 6.90, 23.69, 6.95, 22.59);
              context.bezierCurveTo(7.05, 20.86, 7.76, 16.57, 8.15, 14.35);
              context.bezierCurveTo(8.58, 11.81, 9.06, 7.86, 9.08, 6.47);
              context.bezierCurveTo(9.09, 5.41, 8.83, 3.66, 8.47, 2.59);
              context.bezierCurveTo(8.32, 2.16, 8.06, 1.70, 7.76, 1.30);
              context.bezierCurveTo(7.51, 0.97, 7.03, 0.52, 6.76, 0.34);
              context.bezierCurveTo(6.50, 0.18, 5.90, -0.07, 5.68, -0.12);
              context.bezierCurveTo(5.36, -0.18, 4.23, -0.19, 3.90, -0.13);
              context.bezierCurveTo(3.50, -0.05, 0.71, 0.94, 0.35, 0.93);
              context.bezierCurveTo(0.16, 0.92, -0.04, 0.85, -0.12, 0.74);
              context.bezierCurveTo(-0.25, 0.54, -0.29, -0.11, -0.22, -0.53);
              context.bezierCurveTo(-0.1, -1.23, -0.05, -1.39, 0.03, -1.62);
              context.fill('evenodd');
              context.stroke();
              context.restore();
              context.restore();
          });

          game.player.render();
          if (game.inspector) {
              game.inspector.render();
          }

          // Draw the counter: a 3-layer bar along the bottom of the screen (drawn after the player so it renders in front)
          context.fillStyle = COLORS[5];
          context.fillRect(0, canvas.height - COUNTER_BASE_H, canvas.width, COUNTER_BASE_H);

          context.fillStyle = COLORS[3];
          context.fillRect(0, canvas.height - COUNTER_BASE_H - COUNTER_MID_H, canvas.width, COUNTER_MID_H);

          context.fillStyle = COLORS[4];
          context.fillRect(0, COUNTER_TOP_Y, canvas.width, COUNTER_TOP_H);

          game.customers.forEach((c) => c.render());

          if (game.over) {
              game.ui.over.render();
          } else if (game.onBreak) {
              game.ui.break.render();
          } else if (game.statusTimer > 0) {
              game.ui.status.render();
          }
      },
      update (dt) {
          if (!game.started) {
              return;
          }

          if (game.over) {
              game.overTimer -= dt;

              if (game.overTimer <= 0) {
                  resetGame();
                  game.started = false;
              }

              return;
          }

          if (game.onBreak) {
              game.breakTimer -= dt;

              if (game.breakTimer <= 0) {
                  game.onBreak = false;
              }

              return;
          }


          if (game.statusTimer > 0) {
              tickDown(game, 'statusTimer', dt);
          }

          // Free player movement
          let dx = 0,
              dy = 0;

          if (keyPressed('arrowleft')) {
              dx -= 1;
          }
          if (keyPressed('arrowright')) {
              dx += 1;
          }
          if (keyPressed('arrowup')) {
              dy -= 1;
          }
          if (keyPressed('arrowdown')) {
              dy += 1;
          }

          // Gamepad stick movement (with small deadzone)
          const
              DEADZONE = 0.2,
              // Minimum time between spawns from 0.7s to 1.1s, increases the starting interval from 1.8s to 2.4s, and slows the ramp-down rate (divisor 45 → 60), so customers take longer to bunch up even in later rounds.
              spawnInterval = max(1.1, 2.4 - game.elapsed / 60),
              stickX = axis('leftstickx'),
              stickY = axis('leftsticky');

          if (abs(stickX) > DEADZONE) {
              dx += stickX;
          }
          if (abs(stickY) > DEADZONE) {
              dy += stickY;
          }

          if (dx || dy) {
              const len = hypot(dx, dy);

              game.player.x += (dx / len) * PLAYER_SPEED * dt;
              game.player.y += (dy / len) * PLAYER_SPEED * dt;
          }

          game.player.x = clamp(20, canvas.width - 20, game.player.x);
          game.player.y = clamp(UNICORN_Y + PLAYER_REACH_Y, PLAYER_MAX_Y, game.player.y);

          // Jiggle physics: continuous sinusoidal squish, amplified while moving
          updateSquish(game.player, dt, dx || dy ? 0.1 : 0.04);

          if (game.player.deliverTimer > 0) {
              tickDown(game.player, 'deliverTimer', dt);
          }

          // Tick down each unicorn's tail swing timer (triggered on scoop pickup) and update its idle squish/wiggle
          UNICORNS.forEach((u) => {
              if (u.tailSwingTimer > 0) {
                  tickDown(u, 'tailSwingTimer', dt);
              }

              updateSquish(u, dt, 0.04, u.speedMult);
          });

          spawnTimer += dt;
          game.elapsed += dt;

          if (game.customers.length < game.maxAtOnce && spawnTimer > spawnInterval) {
              spawnTimer = 0;
              spawnCustomer();
          }

          // Move customers, with occasional pauses
          game.customers.forEach((c) => {
              tickPauseTimer(c, dt, 1.2, 1.8, 0.4, 0.8);

              if (c.annoyedTimer > 0) {
                  tickDown(c, 'annoyedTimer', dt);
              }

              if (c.paused) {
                  c.bouncePhase = 0;
              } else {
                  c.x += c.dx * dt;
                  c.bouncePhase += dt * BOUNCE_SPEED;
              }
          });

          // Prevent customers from overlapping the one ahead of them (queue spacing)
          game.customers.sort((a, b) => a.x - b.x);

          for (let i = 1; i < game.customers.length; i += 1) {
              const
                  ahead = game.customers[i - 1],
                  c = game.customers[i],
                  minGap = (c.width + ahead.width) / 2 + 24;

              if (c.x - ahead.x < minGap) {
                  c.x = ahead.x + minGap;
              }
          }

          // Spawn and move the health inspector
          trySpawnInspector(dt);

          if (game.inspector) {
              const
                  inspector = game.inspector,
                  prevX = inspector.x,
                  prevY = inspector.y;

              tickPauseTimer(inspector, dt, 1, 1.5, 0.6, 1);

              if (inspector.annoyedTimer > 0) {
                  tickDown(inspector, 'annoyedTimer', dt);
              }

              if (!inspector.paused) {
                  // Speed up if the player is ahead of the inspector in its direction of travel
                  const
                      aheadInTravelDir = inspector.dirX === 1 ? game.player.x > inspector.x : game.player.x < inspector.x,
                      chaseSpeed = aheadInTravelDir ? inspector.baseSpeed * 1.8 : inspector.baseSpeed;

                  inspector.x += chaseSpeed * inspector.dirX * dt;
                  inspector.y += inspector.vSpeed * inspector.yDir * dt;

                  if (inspector.y <= UNICORN_Y + PLAYER_REACH_Y) {
                      inspector.y = UNICORN_Y + PLAYER_REACH_Y;
                      inspector.yDir = 1;
                  } else if (inspector.y >= PLAYER_MAX_Y) {
                      inspector.y = PLAYER_MAX_Y;
                      inspector.yDir = -1;
                  }
              }

              // Fine the player $3 if the inspector steps on a dumped scoop, and confiscate it
              game.spills = game.spills.filter((s) => {
                  if (!sweptBoxHitsPoint(s, {
                      x: prevX,
                      y: prevY
                  }, inspector, inspector.width / 2 + 6, inspector.height / 2 + 6)) {
                      return true;
                  }

                  setScore(game.score - 3);
                  addReceiptItem('Cleaning Fee', -3);
                  inspector.annoyedTimer = 2 + rnd();

                  return false;
              });

              // Catch the player: fine them $10 and confiscate their carried scoop
              if (dist(game.player, inspector) < INSPECTOR_CATCH_R && game.carrying.length > 0) {
                  game.carrying = [];
                  setScore(game.score - 10);
                  addReceiptItem('Notice of Violation', -10);

                  game.inspector = null;
                  game.inspectorCooldown = INSPECTOR_COOLDOWN;
              } else if (inspector.dirX === 1 && inspector.x > canvas.width + 20) {
                  // Reached the far side: turn around and head back
                  inspector.dirX = -1;
              } else if (inspector.dirX === -1 && inspector.x < -20) {
                  // Completed the return trip without catching anyone
                  game.inspector = null;
                  game.inspectorCooldown = INSPECTOR_COOLDOWN;
              }
          }

          // Move/update the fly swarm: seek the next un-visited spill, hover over it, then despawn off-screen
          trySpawnFlies(dt);

          if (game.flies) {
              const swarm = game.flies;

              swarm.jitterPhase += dt * 3;

              if (!swarm.target) {
                  swarm.target = game.spills.find((s) => !swarm.visited.includes(s));
              }

              if (swarm.target && !game.spills.includes(swarm.target)) {
                  swarm.target = null;
                  swarm.hoverTimer = 0;
              } else if (swarm.target && dist(swarm, swarm.target) < 12) {
                  swarm.hoverTimer ||= FLY_HOVER_TIME;
                  tickDown(swarm, 'hoverTimer', dt);

                  if (swarm.hoverTimer <= 0) {
                      swarm.visited.push(swarm.target);
                      swarm.target.visits += 1;

                      if (swarm.target.visits >= 2) {
                          game.spills = game.spills.filter((s) => s !== swarm.target);
                      }

                      swarm.target = null;
                  }
              } else {
                  const
                      destX = swarm.target ? swarm.target.x : -40,
                      destY = swarm.target ? swarm.target.y : swarm.y,
                      angle = atan2(destY - swarm.y, destX - swarm.x);

                  swarm.x += (cos(angle) * FLY_SPEED + sin(swarm.jitterPhase * 2) * 30) * dt;
                  swarm.y += (sin(angle) * FLY_SPEED + cos(swarm.jitterPhase * 1.7) * 30) * dt;
              }

              // Contaminate the top (most recently scooped) cone if any part of the player overlaps the swarm's spread
              if (game.carrying.length && dist(game.player, swarm) < FLY_CATCH_R + swarm.radius + game.player.width / 2) {
                  game.carrying[game.carrying.length - 1] = CONTAMINATED_COLOR;
                  soundFx('contaminate');
              }

              // Despawn once it has drifted off the left edge with nowhere left to go
              if (!swarm.target && swarm.x < -40) {
                  game.flies = null;
                  game.flyCooldown = FLY_COOLDOWN;
              }
          }


          // Losing a single customer past the counter ends the game
          if (game.customers.some((c) => !c.served && c.x <= -20)) {
              game.over = true;
              game.overTimer = GAME_OVER_DURATION;
              music.stop();
          } else {
              game.customers = game.customers.filter((c) => !c.served);
          }
      }
  });

  game.loop.start();

})();
