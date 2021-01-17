# 问题收集

收集一下阅读 `Vuex` 源码时遇到的一些问题

## 一、_modulesNamespaceMap
代码位置：`./src/store.js/line: 349 ~ 354`

代码展示：
```js
// 如果当前模块设置了namespaced 或 继承了父模块的namespaced，则在modulesNamespaceMap中存储一下当前模块
if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && __DEV__) {
        console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    store._modulesNamespaceMap[namespace] = module
}
```

问题描述：`store._modulesNamespaceMap` 是为了存储设置了命名空间的模块，假设现在有父模块A、子模块B、子孙模块C，其中只有模块B设置了命名空间，此时模块B的 `namespace` 就为 `B/`，那么 `store._modulesNamespaceMap['B/']` 存储的就是模块B。与此同时，模块C因为会继承模块B的命名空间，所以其 `namespace` 也为 `B/`，那么 `store._modulesNamespaceMap['B/']` 原本是存储的模块B，现在却被模块C给替换掉了

