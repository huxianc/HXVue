class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    // 先把旧值保存起来
    this.oldVal = this.getOldVal();
  }

  setOldVal(newVal) {
    if (newVal !== this.oldVal) {
      this.oldVal = newVal;
    }
  }

  getOldVal() {
    Dep.target = this;
    const oldVal = compileUtil.getVal(this.expr, this.vm);
    Dep.target = null;
    return oldVal;
  }

  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm);
    if (newVal !== this.oldVal) {
      this.cb(newVal);
      this.oldVal = newVal;
    }
  }
}

class Dep {
  constructor() {
    this.subs = [];
  }
  // 收集观察者
  addSub(watcher) {
    this.subs.push(watcher);
  }

  // 通知观察者去更新
  notify() {
    console.log("观察者", this.subs);
    this.subs.forEach(w => w.update());
  }
}

class Observer {
  constructor(data) {
    this.observer(data);
  }

  observer(data) {
    if (data && typeof data === "object") {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key]);
      });
    }
  }

  defineReactive(obj, key, value) {
    this.observer(value);
    let dep = new Dep();
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get() {
        // 订阅数据变化时，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: newVal => {
        this.observer(newVal);
        if (newVal !== value) {
          value = newVal;
          // 告诉 Dep 通知变化
          dep.notify();
          return value;
        }
      },
    });
  }
}
