const compileUtil = {
  getVal(expr, vm) {
    return expr.split(".").reduce((data, currentVal) => {
      return data[currentVal];
    }, vm.$data);
  },
  setVal(expr, vm, inputVal) {
    return expr.split(".").reduce((data, currentVal) => {
      data[currentVal] = inputVal;
    }, vm.$data);
  },
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm);
    });
  },
  text(node, expr, vm) {
    let value;
    if (expr.includes("{{")) {
      // {{person.name}} -- {{person.age}}
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        new Watcher(vm, args[1], _ => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm));
        });
        return this.getVal(args[1], vm);
      });
    } else {
      new Watcher(vm, expr, newVal => {
        this.updater.textUpdater(node, newVal);
      });
      value = this.getVal(expr, vm);
    }
    this.updater.textUpdater(node, value);
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm);
    new Watcher(vm, expr, newVal => {
      this.updater.htmlUpdater(node, newVal);
    });
    this.updater.htmlUpdater(node, value);
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm);
    // 绑定更新函数  数据 => 视图
    new Watcher(vm, expr, newVal => {
      this.updater.modelUpdater(node, newVal);
    });
    // 视图 => 数据 => 视图
    node.addEventListener("input", e => {
      // 设置值
      this.setVal(expr, vm, e.target.value);
    });
    this.updater.modelUpdater(node, value);
  },
  on(node, expr, vm, evnentName) {
    let fn = vm.$options.methods && vm.$options.methods[expr];
    if (fn) {
      node.addEventListener(evnentName, fn.bind(vm), false);
    }
  },
  bind(node, expr, vm, attrName) {
    const value = this.getVal(expr, vm);
    if (value) {
      this.updater.bindUpdater(node, attrName, value);
    }
  },
  // 更新函数
  updater: {
    bindUpdater(node, attrName, value) {
      node.setAttribute(attrName, value);
    },
    textUpdater(node, value) {
      node.textContent = value;
    },
    htmlUpdater(node, value) {
      node.innerHTML = value;
    },
    modelUpdater(node, value) {
      node.value = value;
    },
  },
};

class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    this.vm = vm;
    // 1.获取文档碎片对象 放入内存中会减少页面的回流和重绘
    const fragment = this.node2Fragment(this.el);

    // 2.编译模板
    this.compile(fragment);

    // 3.追加子元素到根元素
    this.el.appendChild(fragment);
  }

  compile(fragment) {
    //   1.获取子节点
    const childNodes = fragment.childNodes;
    [...childNodes].forEach(child => {
      // console.log('child', child)
      if (this.isElementNode(child)) {
        // 是元素节点
        // 编译元素节点
        this.compileElement(child);
      } else {
        // 文本节点
        this.compileText(child);
      }

      // 判断是否有子元素
      if (child.childNodes && child.childNodes.length) {
        this.compile(child);
      }
    });
  }

  compileElement(node) {
    // v-text
    const attributes = node.attributes;
    [...attributes].forEach(attr => {
      const { name, value } = attr;
      if (this.isDirective(name)) {
        // 是指令
        const [, directive] = name.split("-");
        const [dirName, evnentName] = directive.split(":"); // v-on:click
        // 更新数据
        compileUtil[dirName](node, value, this.vm, evnentName);
        // 删除指令标签上的指令
        node.removeAttribute("v-" + directive);
      } else if (this.isEventName(name)) {
        // @click
        let [, evnentName] = name.split("@");
        compileUtil["on"](node, value, this.vm, evnentName);
        node.removeAttribute("@" + evnentName);
      }
    });
  }

  compileText(node) {
    // {{}}
    const content = node.textContent;
    if (/\{\{(.+?)\}\}/g.test(content)) {
      compileUtil["text"](node, content, this.vm);
    }
  }

  node2Fragment(el) {
    //   创建文档碎片
    const f = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = el.firstChild)) {
      f.appendChild(firstChild);
    }
    return f;
  }

  isEventName(attrName) {
    return attrName.startsWith("@");
  }

  isDirective(attrName) {
    return attrName.startsWith("v-");
  }

  isElementNode(node) {
    return node.nodeType === 1;
  }
}

class HXVue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;
    if (this.$el) {
      // 1.实现一个数据观察者
      new Observer(this.$data);
      // 2.实现一个指令解析器
      new Compile(this.$el, this);
      // 3..实现data数据代理
      this.proxyData(this, this.$el, this.$data);
    }
  }

  proxyData(vm, el, data) {
    for (let key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set(newVal) {
          new Compile(el, vm);
          data[key] = newVal;
        },
      });
    }
  }
}
