/**
 * 找到数组list中第一个符合要求的元素
 * @param {Array} list
 * @param {Function} f
 * @return {*}
 */
export function find (list, f) {
  return list.filter(f)[0]
}

/**
 * 深拷贝
 * 
 * @param {*} obj
 * @param {Array<Object>} cache
 * @return {*}
 */
export function deepCopy (obj, cache = []) {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = find(cache, c => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy
  })

  Object.keys(obj).forEach(key => {
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}

/**
 * 遍历obj对象的每个属性的键和值,用fn对其进行操作
 * @param {*} obj 
 * @param {*} fn 
 */
export function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}

/**
 * 判断是否为对象（排除null）
 * @param {*} obj 
 */
export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * 判断是否为Promise对象
 * @param {*} val 
 */
export function isPromise (val) {
  return val && typeof val.then === 'function'
}

/**
 * 断言 传入的condition是否正确，如果为false 返回msg
 * @param {*} condition 
 * @param {*} msg 
 */
export function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}

/**
 * 保留原始参数的闭包函数
 * @param {*} fn 
 * @param {*} arg 
 */
export function partial (fn, arg) {
  return function () {
    return fn(arg)
  }
}
