/**
 * @module ol/geom/MultiLineString
 */
import {extend} from '../array.js';
import {closestSquaredDistanceXY} from '../extent.js';
import GeometryLayout from '../geom/GeometryLayout.js';
import GeometryType from '../geom/GeometryType.js';
import LineString from '../geom/LineString.js';
import SimpleGeometry from '../geom/SimpleGeometry.js';
import {assignClosestArrayPoint, arrayMaxSquaredDelta} from '../geom/flat/closest.js';
import {deflateCoordinatesArray} from '../geom/flat/deflate.js';
import {inflateCoordinatesArray} from '../geom/flat/inflate.js';
import {interpolatePoint, lineStringsCoordinateAtM} from '../geom/flat/interpolate.js';
import {intersectsLineStringArray} from '../geom/flat/intersectsextent.js';
import {douglasPeuckerArray} from '../geom/flat/simplify.js';

/**
 * @classdesc
 * Multi-linestring geometry.
 *
 * @api
 */
class MultiLineString extends SimpleGeometry {

  /**
   * @param {Array<Array<import("../coordinate.js").Coordinate>|import("../geom.js").MultiLineString>|Array<number>} coordinates
   *     Coordinates or LineString geometries. (For internal use, flat coordinates in
   *     combination with `opt_layout` and `opt_ends` are also accepted.)
   * @param {import("./GeometryLayout.js").default=} opt_layout Layout.
   * @param {Array<number>=} opt_ends Flat coordinate ends for internal use.
   */
  constructor(coordinates, opt_layout, opt_ends) {

    super();

    /**
     * @type {Array<number>}
     * @private
     */
    this.ends_ = [];

    /**
     * @private
     * @type {number}
     */
    this.maxDelta_ = -1;

    /**
     * @private
     * @type {number}
     */
    this.maxDeltaRevision_ = -1;

    if (Array.isArray(coordinates[0])) {
      this.setCoordinates(coordinates, opt_layout);
    } else if (opt_layout !== undefined && opt_ends) {
      this.setFlatCoordinates(opt_layout, coordinates);
      this.ends_ = opt_ends;
    } else {
      let layout = this.getLayout();
      const flatCoordinates = [];
      const ends = [];
      for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        const lineString = coordinates[i];
        if (i === 0) {
          layout = lineString.getLayout();
        }
        extend(flatCoordinates, lineString.getFlatCoordinates());
        ends.push(flatCoordinates.length);
      }
      this.setFlatCoordinates(layout, flatCoordinates);
      this.ends_ = ends;
    }

  }

  /**
   * Append the passed linestring to the multilinestring.
   * @param {import("./LineString.js").default} lineString LineString.
   * @api
   */
  appendLineString(lineString) {
    if (!this.flatCoordinates) {
      this.flatCoordinates = lineString.getFlatCoordinates().slice();
    } else {
      extend(this.flatCoordinates, lineString.getFlatCoordinates().slice());
    }
    this.ends_.push(this.flatCoordinates.length);
    this.changed();
  }

  /**
   * Make a complete copy of the geometry.
   * @return {!MultiLineString} Clone.
   * @override
   * @api
   */
  clone() {
    return new MultiLineString(this.flatCoordinates.slice(), this.layout, this.ends_.slice());
  }

  /**
   * @inheritDoc
   */
  closestPointXY(x, y, closestPoint, minSquaredDistance) {
    if (minSquaredDistance < closestSquaredDistanceXY(this.getExtent(), x, y)) {
      return minSquaredDistance;
    }
    if (this.maxDeltaRevision_ != this.getRevision()) {
      this.maxDelta_ = Math.sqrt(arrayMaxSquaredDelta(
        this.flatCoordinates, 0, this.ends_, this.stride, 0));
      this.maxDeltaRevision_ = this.getRevision();
    }
    return assignClosestArrayPoint(
      this.flatCoordinates, 0, this.ends_, this.stride,
      this.maxDelta_, false, x, y, closestPoint, minSquaredDistance);
  }

  /**
   * Returns the coordinate at `m` using linear interpolation, or `null` if no
   * such coordinate exists.
   *
   * `opt_extrapolate` controls extrapolation beyond the range of Ms in the
   * MultiLineString. If `opt_extrapolate` is `true` then Ms less than the first
   * M will return the first coordinate and Ms greater than the last M will
   * return the last coordinate.
   *
   * `opt_interpolate` controls interpolation between consecutive LineStrings
   * within the MultiLineString. If `opt_interpolate` is `true` the coordinates
   * will be linearly interpolated between the last coordinate of one LineString
   * and the first coordinate of the next LineString.  If `opt_interpolate` is
   * `false` then the function will return `null` for Ms falling between
   * LineStrings.
   *
   * @param {number} m M.
   * @param {boolean=} opt_extrapolate Extrapolate. Default is `false`.
   * @param {boolean=} opt_interpolate Interpolate. Default is `false`.
   * @return {import("../coordinate.js").Coordinate} Coordinate.
   * @api
   */
  getCoordinateAtM(m, opt_extrapolate, opt_interpolate) {
    if ((this.layout != GeometryLayout.XYM &&
         this.layout != GeometryLayout.XYZM) ||
        this.flatCoordinates.length === 0) {
      return null;
    }
    const extrapolate = opt_extrapolate !== undefined ? opt_extrapolate : false;
    const interpolate = opt_interpolate !== undefined ? opt_interpolate : false;
    return lineStringsCoordinateAtM(this.flatCoordinates, 0,
      this.ends_, this.stride, m, extrapolate, interpolate);
  }

  /**
   * Return the coordinates of the multilinestring.
   * @return {Array<Array<import("../coordinate.js").Coordinate>>} Coordinates.
   * @override
   * @api
   */
  getCoordinates() {
    return inflateCoordinatesArray(
      this.flatCoordinates, 0, this.ends_, this.stride);
  }

  /**
   * @return {Array<number>} Ends.
   */
  getEnds() {
    return this.ends_;
  }

  /**
   * Return the linestring at the specified index.
   * @param {number} index Index.
   * @return {import("./LineString.js").default} LineString.
   * @api
   */
  getLineString(index) {
    if (index < 0 || this.ends_.length <= index) {
      return null;
    }
    return new LineString(this.flatCoordinates.slice(
      index === 0 ? 0 : this.ends_[index - 1], this.ends_[index]), this.layout);
  }

  /**
   * Return the linestrings of this multilinestring.
   * @return {Array<import("./LineString.js").default>} LineStrings.
   * @api
   */
  getLineStrings() {
    const flatCoordinates = this.flatCoordinates;
    const ends = this.ends_;
    const layout = this.layout;
    /** @type {Array<import("./LineString.js").default>} */
    const lineStrings = [];
    let offset = 0;
    for (let i = 0, ii = ends.length; i < ii; ++i) {
      const end = ends[i];
      const lineString = new LineString(flatCoordinates.slice(offset, end), layout);
      lineStrings.push(lineString);
      offset = end;
    }
    return lineStrings;
  }

  /**
   * @return {Array<number>} Flat midpoints.
   */
  getFlatMidpoints() {
    const midpoints = [];
    const flatCoordinates = this.flatCoordinates;
    let offset = 0;
    const ends = this.ends_;
    const stride = this.stride;
    for (let i = 0, ii = ends.length; i < ii; ++i) {
      const end = ends[i];
      const midpoint = interpolatePoint(
        flatCoordinates, offset, end, stride, 0.5);
      extend(midpoints, midpoint);
      offset = end;
    }
    return midpoints;
  }

  /**
   * @inheritDoc
   */
  getSimplifiedGeometryInternal(squaredTolerance) {
    const simplifiedFlatCoordinates = [];
    const simplifiedEnds = [];
    simplifiedFlatCoordinates.length = douglasPeuckerArray(
      this.flatCoordinates, 0, this.ends_, this.stride, squaredTolerance,
      simplifiedFlatCoordinates, 0, simplifiedEnds);
    return new MultiLineString(simplifiedFlatCoordinates, GeometryLayout.XY, simplifiedEnds);
  }

  /**
   * @inheritDoc
   * @api
   */
  getType() {
    return GeometryType.MULTI_LINE_STRING;
  }

  /**
   * @inheritDoc
   * @api
   */
  intersectsExtent(extent) {
    return intersectsLineStringArray(
      this.flatCoordinates, 0, this.ends_, this.stride, extent);
  }

  /**
   * Set the coordinates of the multilinestring.
   * @param {!Array<Array<import("../coordinate.js").Coordinate>>} coordinates Coordinates.
   * @param {import("./GeometryLayout.js").default=} opt_layout Layout.
   * @override
   * @api
   */
  setCoordinates(coordinates, opt_layout) {
    this.setLayout(opt_layout, coordinates, 2);
    if (!this.flatCoordinates) {
      this.flatCoordinates = [];
    }
    const ends = deflateCoordinatesArray(
      this.flatCoordinates, 0, coordinates, this.stride, this.ends_);
    this.flatCoordinates.length = ends.length === 0 ? 0 : ends[ends.length - 1];
    this.changed();
  }
}


export default MultiLineString;
