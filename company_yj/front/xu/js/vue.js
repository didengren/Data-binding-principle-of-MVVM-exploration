/*
 * 订阅器/依赖
 */
function Dep(){
  this.subs = []
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
    Object.defineProperty(vm, key, {
      get: function(){
        if(Dep.__watcher__)
          dep.addSub(Dep.__watcher__)
        return dataObj[key]
      },
      set: function(newVal){
        if(newVal === dataObj[key]) return
        dataObj[key] = newVal
        dep.notify()
        vm.$watch(key, newVal)
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
  this.$methods = options.methods
  // this.initMethods(this.$methods)
  new Observer(this.data, this)
  this.watch = options.watch
  var parentNode = document.getElementById(options.el)
  new Compile(parentNode, this)
}
/*
 * 定义实例方法
 * $watch 监听
 */
Vue.prototype = {
  $watch: function(key ,newVal){
    if(this[key] == this.watch[key]){
      this.watch[key](newVal, this)
    }
  },
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
        //走观察者路线
        node.addEventListener('input', function(e){
          var newVal = e.target.value
          for(var item in vm.watch){
            vm.watch[item](newVal, vm)
          }
        })
        node.value = vm[vModelVal];
        node.removeAttribute('v-model')
      }else if(attrList[i].nodeName.indexOf('@')>-1){
        var eventName = attrList[i].nodeName
        var eventFn = attrList[i].nodeValue
        resolveEvent(node, eventName, eventFn, vm)
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

function resolveEvent(node, eventName, eventFn, vm){
  if(eventName == '@click'){
    listenClick(node, eventFn, vm)
  }
}
function listenClick(node, eventFn, vm){
  node.addEventListener('click', function(e){
    vm[eventFn] = vm.$methods[eventFn]
    vm[eventFn]()
  })
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
