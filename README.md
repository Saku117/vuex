# 说明
本仓库用于阅读并记录 `Vuex` 源码，**注：** 所有对于源码的解读都在相应文件中加上了中文注释

非常建议一些能力有限并且从未阅读过成熟库源码的前端把 **Vuex源码** 作为自己第一个阅读源码的库，因为它本身代码量只有几百行，实现逻辑也非常易懂，我相信只要用心、肯花费时间，一定能将它的源码读懂的

当然，阅读源码的前提是你必须对这个库有一定的使用经验以及了解，否则就算开始阅读源码了，你也很难知道它在做什么  ➡️   [Vuex文档链接](https://vuex.vuejs.org/zh/)

刚开始做好阅读源码的准备，我给自己定下的期限是 `15`天

`Vuex`也是我第一次阅读源码的库，本仓库会记录下我阅读源码的全过程以及经验分享，希望可以帮助到大家～

# 进度（4/15）
**【2021年】** 每天阅读2小时（时间线中若未出现的日期，可能是因为其它事情耽搁了）

> **Start**   1月15日 ：熟悉了 `Modules` 的注册流程

>1月16日：了解了一下每个 `module` 注册 `state` 、`mutations` 、`actions`、`getters` 的大体流程

>1月17日：详细了解了 `vm` 对 `state` 、`getters` 的处理方式

>1月19日：大致了解完了全部的流程，但还有很多细节没明白，并攥写了部分源码的阅读文档
# 源码解析

## 一、源码目录结构分析
整个 `Vuex` 的源码文件非常多，我们直接看最主要的文件，即 `src` 文件夹中的内容，结构示例如下：

```js
├── src
    ├── module    // 与模块相关的操作
    │   ├── module-collection.js   // 用于收集并注册根模块以及嵌套模块
    │   └── module.js   // 定义Module类，存储模块内的一些信息，例如: state...
    │
    ├── plugins   // 一些插件
    │   ├── devtool.js   // 开发调试插件
    │   └── logger.js    // 
    │
    ├── helpers.js       // 辅助函数，例如：mapState、mapGetters、mapMutations...
    ├── index.cjs.js     // commonjs 打包入口
    ├── index.js         // 入口文件
    ├── index.mjs        // es6 module 打包入口
    ├── mixin.js         // 将vuex实例挂载到全局Vue的$store上
    ├── store.js         // 核心文件，定义了Store类
    └── util.js          // 提供一些工具函数，例如: deepCopy、isPromise、isObject...
```



## 二、源码阅读

### 1. 查看工具函数

首先我个人觉得肯定是要看一下 `util.js` ，这里面存放的是源码中频繁用到的工具函数，所以我觉得要最先了解一下每个函数的作用是什么

```js
/**
 * Get the first item that pass the test
 * by second argument function
 *
 * @param {Array} list
 * @param {Function} f
 * @return {*}
 */

// 找到数组list中第一个符合要求的元素
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

// 遍历obj对象的每个属性的值
export function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}

// 判断是否为对象（排除null）
export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

// 判断是否为Promise对象
export function isPromise (val) {
  return val && typeof val.then === 'function'
}

// 断言
export function assert (condition, msg) {
  if (!condition) throw new Error(`[vuex] ${msg}`)
}

// 保留原始参数的闭包函数
export function partial (fn, arg) {
  return function () {
    return fn(arg)
  }
}
```

每个函数的作用我都写上了注释，稍微阅读一下应该可以明白其作用

### 2. 入口文件

最主要的代码都在 `src` 目录下，所以以下提到的文件都是默认 `src` 目录下的文件

首先，肯定从入口文件 `index.js` 开始看，但能发现的是，还有 `index.cjs` 和 `index.mjs` ，这两者分别是 `commonjs` 和 `es6 module` 的打包入口，我们就不用管了

```js
import { Store, install } from './store'
import { mapState, mapMutations, mapGetters, mapActions, createNamespacedHelpers } from './helpers'
import createLogger from './plugins/logger'

export default {
  Store,
  install,
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
  createLogger
}

export {
  Store,
  install,
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers,
  createLogger
}
```

从入口文件中可以看到，主要导出了 `Store` 类 、`install` 方法以及一些辅助函数（mapState、mapMutations、mapGetters...）

那么我们主要看的就是 `vuex` 的核心代码，即 `store.js` ，可以看到 `Store` 类就出自于这个文件

### 2. Store类的实现

整个 `Store` 类的主要逻辑都在它的构造函数 `constructor` 中，因此我们就从 `constructor` 中分步去捋逻辑、看代码

#### 2.1 存放类的状态

首先是定义了一些实例状态，用于存放模块、`mutations` 、`actions` 、`getters` 缓存等东西

```js
const {
  plugins = [],
  strict = false
} = options      // 生成Store类的入参

this._committing = false        // 表示提交的状态，即在执行mutations方法时，该状态为true

this._actions = Object.create(null)  // 用于记录所有存在的actions方法名称（包括全局的和命名空间内的，且允许重复定义）      

this._actionSubscribers = []       // 存放actions方法订阅的回调函数

this._mutations = Object.create(null)  // 用于记录所有存在的的mutations方法名称（包括全局的和命名空间内的，且允许重复定义）

this._wrappedGetters = Object.create(null)  // 收集所有模块包装后的的getters（包括全局的和命名空间内的，但不允许重复定义）

this._modules = new ModuleCollection(options)  // 根据传入的options配置，注册各个模块，此时只是注册、建立好了各个模块的关系，已经定义了各个模块的state状态，但getters、mutations等方法暂未注册

this._modulesNamespaceMap = Object.create(null)   // 存储定义了命名空间的模块

this._subscribers = []    // 存放mutations方法订阅的回调

this._watcherVM = new Vue()  // 用于监听state、getters

this._makeLocalGettersCache = Object.create(null)   // getters的本地缓存
```

关于各个变量状态的作用都写在这了，其中只有 `this._modules = new ModuleCollection(option)` 执行了一些操作，其作用就是进行**模块递归收集**，根据 `ModuleCollection` 的来源，我们移步到 `./module/module-collection.js` 文件

##### 2.1.1 递归收集模块

在 `Module-collection.js` 文件中定义了 `ModuleCollection` 类，其作用就是通过递归遍历 `options` 入参，将每个模块都生成一个独立的 `Moudle`

这里先来熟悉一下 `options` 的结构，如下：

```js
import Vuex from 'vuex'

const options = {
  state: {...},
  getters: {...},
  mutations: {...},
  actions: {...},
  modules: {
    ModuleA: {
      state: {...},
      ...
      modules: {
        ModuleA1: {...}
      }
    },
    ModuleB: {
      state: {...},
      ...
      modules: {
        ModuleB1: {...}
      }
    }
  }
}

const store = new Vuex.Store(options)

export default store
```

可以看到传入的 `options` 整体可以看成一个根模块 `root` ，然后 `root` 的 `modules` 中嵌套着另外两个子模块：`ModuleA` 和`ModuleB` ，而 `ModuleA` 和`ModuleB` 内部也分别嵌套着一个子模块，分别为 `ModuleA1` 、`ModuleB1` 。这样就组成了一个模块树，因此 `ModuleCollection` 类的工作就是将保留原来的模块关系，将每个模块封装到一个 `Module` 类中

```js
export default class ModuleCollection {
  constructor (rawRootModule) {
    // 递归注册模块
    this.register([], rawRootModule, false)
  }
  
  // 根据路径顺序，从根模块开始递归获取到我们准备添加新的模块的父模块
  get (path) {
    return path.reduce((module, key) => {
      return module.getChild(key)
    }, this.root)
  }
  
  // 递归注册模块
  register (path, rawModule, runtime = true) {
    if (__DEV__) {
      assertRawModule(path, rawModule)
    }
    
    const newModule = new Module(rawModule, runtime)  // 初始化一个新的模块
    if (path.length === 0) {    // 当前没有别的模块
      this.root = newModule     // 则此模块为根模块
    } else {    // 有多个模块     
      const parent = this.get(path.slice(0, -1))   // 获取到新模块从属的父模块，所以是path.slice(0, -1)，最后一个元素就是我们要添加的子模块的名称
      parent.addChild(path[path.length - 1], newModule)    // 在父模块中添加新的子模块
    }

    if (rawModule.modules) {     // 如果有嵌套模块
      /**
       *  1. 遍历所有的子模块，并进行注册;
       *  2. 在path中存储除了根模块以外所有子模块的名称
       *  */ 
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
}
```

`register(path, rawModule, runtime)`：注册新的模块，并根据模块的嵌套关系，将新模块添加作为对应模块的子模块

- path：表示模块嵌套关系。当前为根模块时，没有任何嵌套关系，此时 `path = []` ; 当前不时根模块时，存在嵌套关系，例如上述例子中的 `ModuleA1` ，它是 `ModuleA` 的子模块 ，而 `ModuleA` 又是根模块的子模块，此时 `path = ['ModuleA', 'ModuleA1']`
- rawModule：表示模块对象，此时是一个对象类型
- runtime：表示程序运行时



`get(path)`：根据传入的 `path` 路径，获取到我们想要的 `Module` 类

`ModuleCollection` 的构造函数中调用了 `register` 函数，前两个参数分别为：`[]` 、`rawRootModule` ，此时肯定是从根模块开始注册的，所以 `path` 里无内容，并且 `rawRootModule` 指向的是根模块



然后来看一下 `register` 函数里的逻辑。

首先将当前要注册的模块生成一个 `Module` ，并将 `rawModule` 作为参数，用于存放 `Module` 的信息

然后通过 `if(path.length === 0)` 判断为根模块，

# 最后
若本仓库对于 `Vuex` 源码阅读有任何错误的地方，欢迎大家给我提 `Issues`，一定虚心听取你们的指正

