/*
 * 订阅器/依赖
 */
function Dep(){
  this.subs = [] //由于Watcher每次实例化时添加的__watcher__，用完就删除掉 保证了每次只有一个订阅者更新 也就是每次只有一个节点刷新其他节点没有刷新
}
Dep.prototype = {
  addSub: function(sub){
    this.subs.push(sub)
  },
  notify: function(){
    this.subs.forEach(function(sub){
      sub.update()
    })
  }
}

/*
 * 观察者 Observer
 * @param vm Vue实例
 * @param dataObj 数据池
 */
function Observer(dataObj, vm){
  Object.keys(dataObj).forEach(function(key){
    var dep = new Dep()
    Object.defineProperty(vm, key, { //vm[key]
      get: function(){
        if(Dep.__watcher__)
          dep.addSub(Dep.__watcher__) //数据池每一次变化就添加一个订阅者
        return dataObj[key]
      },
      set: function(newVal){
        if(newVal === dataObj[key]) return
        dataObj[key] = newVal
        dep.notify() //数据池每一次变化就通知订阅者更新节点内容
      }
    })
  })
}

/*
 * MVVM类 Vue
 * @param object{el//元素id, data//数据池 {text}, watch//事件监听处理对象}
 */
function Vue(options){
  this.data = options.data
  this.methods = options.methods
  // this.initMethods(this.$methods)
  new Observer(this.data, this)
  this.watch = options.watch
  var parentNode = document.getElementById(options.el)
  new Compile(parentNode, this)
}
/*
 * 定义实例方法
 * $watch 监听
 * $methods 方法处理器
 */
Vue.prototype = {
  $watch: function(node){
    var vm = this
    node.addEventListener('input', function(e){
      var newVal = e.target.value
      for(var item in vm.watch){
        if(vm.watch[item]){
          vm.watch[item](newVal, vm)
        }
      }
    })
  },
  $methods: function(node, attrEvent){
    var vm = this
    var eventName = attrEvent.nodeName.split('@')[1]
    var eventFn = attrEvent.nodeValue
    node.addEventListener(eventName, function(e){
      vm.methods[eventFn](vm)
    })
  }
  // initMethods: function(methods){
  //   this[key] = methods[key]==null?null:this.bind(methods[key])
  // },
  // bind: function(fn){
  //   if(typeof fn === 'function')
  //     return fn()
  // }
}

/*
 * 编译区 生成处理节点碎片 指令编译
 * @param parentNode 父节点
 * @param vm Vue实例
 */
function Compile(parentNode, vm){
  var _this = this
  this.vm = vm
  var frag = this.nodeToFragment(parentNode)
  var childNodes = frag.childNodes
  Array.prototype.slice.call(childNodes).forEach(function(node){
    if(node.nodeType == 1){
      //node是节点
      _this.compileAttr(node, _this.vm)
    }else if(node.nodeType == 3){
      //node是text
      _this.compileText(node, _this.vm)
    }
    if(node.childNodes&&node.childNodes.length){
      new Compile(node, _this.vm)
    }
  })
  parentNode.appendChild(frag)
}
Compile.prototype = {
  //加入碎片节点
  nodeToFragment: function(parentNode){
    var frag = document.createDocumentFragment()
    var childNode;
    while(childNode = parentNode.firstChild){
      frag.appendChild(childNode)
    }
    return frag
  },
  compileAttr: function(node, vm){
    var attrList = node.attributes
    for(var i=0; i<attrList.length; i++){
      if(attrList[i].nodeName=='v-model'){
        var vModelVal = attrList[i].nodeValue
        //初始化
        new Watcher(vm, vModelVal, node)
        vm.$watch(node)
        node.removeAttribute('v-model')
      }else if(attrList[i].nodeName.indexOf('@')>-1){
        vm.$methods(node, attrList[i])
      }
    }
  },
  compileText: function(node, vm){
    var reg = /\{\{(.*)\}\}/
    if(reg.test(node.nodeValue)){
      var nvName = RegExp.$1.trim()
      //初始化
      new Watcher(vm, nvName, node)
    }
  }
}

/*
 * 订阅者 Watcher
 * @param vm vue实例
 * @param nvName nodeValue占位符名
 * @param node childNode
 */
function Watcher(vm, nvName, node){
  Dep.__watcher__ = this
  this.vm = vm
  this.nvName = nvName
  this.node = node
  this.update()
  Dep.__watcher__ = null
}
Watcher.prototype = {
  update: function(){
    this.node.nodeValue = this.node.value = this.vm[this.nvName]
  }
}
