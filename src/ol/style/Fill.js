/**
 * @module ol/style/Fill
 */
import {getUid} from '../util.js';
import {asString} from '../color.js';


/**
 * @typedef {Object} Options
 * @property {import("../color.js").Color|import("../colorlike.js").ColorLike} [color] A color, gradient or pattern.
 * See {@link module:ol/color~Color} and {@link module:ol/colorlike~ColorLike} for possible formats.
 * Default null; if null, the Canvas/renderer default black will be used.
 */


/**
 * @classdesc
 * Set fill style for vector features.
 * @api
 */
class Fill {
  /**
   * @param {Options=} opt_options Options.
   */
  constructor(opt_options) {

    const options = opt_options || {};

    /**
     * @private
     * @type {import("../color.js").Color|import("../colorlike.js").ColorLike}
     */
    this.color_ = options.color !== undefined ? options.color : null;

    /**
     * @private
     * @type {string|undefined}
     */
    this.checksum_ = undefined;
  }

  /**
   * Clones the style. The color is not cloned if it is an {@link module:ol/colorlike~ColorLike}.
   * @return {Fill} The cloned style.
   * @api
   */
  clone() {
    const color = this.getColor();
    return new Fill({
      color: (color && color.slice) ? color.slice() : color || undefined
    });
  }

  /**
   * Get the fill color.
   * @return {import("../color.js").Color|import("../colorlike.js").ColorLike} Color.
   * @api
   */
  getColor() {
    return this.color_;
  }

  /**
   * Set the color.
   *
   * @param {import("../color.js").Color|import("../colorlike.js").ColorLike} color Color.
   * @api
   */
  setColor(color) {
    this.color_ = color;
    this.checksum_ = undefined;
  }

  /**
   * @return {string} The checksum.
   */
  getChecksum() {
    if (this.checksum_ === undefined) {
      if (
        this.color_ instanceof CanvasPattern ||
          this.color_ instanceof CanvasGradient
      ) {
        this.checksum_ = getUid(this.color_).toString();
      } else {
        this.checksum_ = 'f' + (this.color_ ? asString(this.color_) : '-');
      }
    }

    return this.checksum_;
  }
}

export default Fill;
