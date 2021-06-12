const DAY = 86400000;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function seed(time) {
  const now = new Date().getTime();
  if (now - time <= DAY) {
    return [];
  }
  const timeline = [];
  var days = Math.floor((now - time) / DAY);
  while (days > 0) {
    var r = getRandomInt(1, days);
    if (r > days) {
      r = days;
      days = 0;
    } else {
      days -= r;
    }
    time += (r * DAY);
    timeline.push(time);
  }
  return timeline;
}

window.addEventListener("load", function() {

  const DATABASE = 'HABITS';

  localforage.setDriver(localforage.LOCALSTORAGE);

  const state = new KaiState({
    [DATABASE]: {},
  });

  localforage.getItem(DATABASE)
  .then((DB) => {
    if (DB == null) {
      DB = {};
    }
    state.setState(DATABASE, DB);
  });

  const habitEditor = function($router, habit = null) {
    var date = habit ? new Date(habit.start) : new Date();

    $router.push(
      new Kai({
        name: 'editorHabit',
        data: {
          name: habit ? habit.name : '',
          type: habit ? (habit.type ? 'Positive' : 'Negative') : 'Positive',
          start: date.toLocaleDateString(),
          target: habit ? habit.target : '',
          startVisible: habit ? false : true,
        },
        verticalNavClass: '.editorHabitNav',
        templateUrl: document.location.origin + '/templates/editorHabit.html',
        mounted: function() {
          this.$router.setHeaderTitle('Habit Editor');
        },
        unmounted: function() {},
        methods: {
          selected: function() {},
          setType: function() {
            var menu = [
              { "text": "Positive", "checked": false },
              { "text": "Negative", "checked": false }
            ];
            const idx = menu.findIndex((opt) => {
              return opt.text === this.data.type;
            });
            this.$router.showSingleSelector('Type', menu, 'Select', (selected) => {
              this.setData({
                name: document.getElementById('name').value,
                target: document.getElementById('target').value,
                type: selected.text
              });
            }, 'Cancel', null, undefined, idx);
          },
          setDate: function() {
            const d = new Date(date);
            this.$router.showDatePicker(d.getFullYear(), d.getMonth() + 1, d.getDate(), (dt) => {
              date = dt;
              this.setData({
                name: document.getElementById('name').value,
                target: document.getElementById('target').value,
                start: date.toLocaleDateString()
              });
            }, undefined);
          },
          submit: function() {
            try {
              var _habit = {
                id: habit ? habit.id : new Date().getTime(),
                name: this.data.name.trim(),
                type: this.data.type === `Positive` ? true : false,
                start: date.getTime(),
                timeline: habit ? habit.timeline : [], // seed(date.getTime())
                target: JSON.parse(this.data.target) || 0
              }
              if (_habit.name.length === 0 ) {
                $router.showToast('Name is required');
              } else if (_habit.target === 0 ) {
                $router.showToast('Target day is required');
              } else {
                localforage.getItem(DATABASE)
                .then((DB) => {
                  if (DB == null) {
                    DB = {};
                  }
                  DB[_habit.id] = _habit;
                  return localforage.setItem(DATABASE, DB);
                })
                .then((UPDATED) => {
                  $router.showToast(`${habit ? 'Updated' : 'Added'} ${_habit.name}`);
                  state.setState(DATABASE, UPDATED);
                  $router.pop();
                });
              }
            } catch (e) {
              console.log(e.toString());
              $router.showToast('Error');
            }
          }
        },
        softKeyText: { left: '', center: '', right: '' },
        softKeyListener: {
          left: function() {},
          center: function() {
            const listNav = document.querySelectorAll(this.verticalNavClass);
            if (this.verticalNavIndex > -1) {
              if (listNav[this.verticalNavIndex]) {
                listNav[this.verticalNavIndex].click();
              }
            }
          },
          right: function() {}
        },
        dPadNavListener: {
          arrowUp: function() {
            this.data.name = document.getElementById('name').value;
            this.data.target = document.getElementById('target').value;
            this.navigateListNav(-1);
          },
          arrowRight: function() {
            //this.navigateTabNav(-1);
          },
          arrowDown: function() {
            this.data.name = document.getElementById('name').value;
            this.data.target = document.getElementById('target').value;
            this.navigateListNav(1);
          },
          arrowLeft: function() {
            //this.navigateTabNav(1);
          },
        }
      })
    );
  }

  const analyzeHabit = function(habit) {
    const LENGTH = habit.timeline.length;
    var t1 = 0, t2 = 0, progress = 0;
    var t1_str = 0, t2_str = 0;
      if (LENGTH === 0) {
        const s = new Date();
        s.setHours(0,0,0,0);
        const e = new Date(habit.start);
        e.setHours(0,0,0,0);
        const t = Math.floor((s.getTime() - e.getTime()) / DAY);
        t1 = habit.type ? 1 : t;
        t2 = habit.type ? 1 : t1;
      } else if (LENGTH === 1) {
        const s = new Date(habit.timeline[0]);
        s.setHours(0,0,0,0);
        const e = new Date(habit.start);
        e.setHours(0,0,0,0);
        const tx = Math.floor((s.getTime() - e.getTime()) / DAY);
        t1 = tx;
        const start = new Date();
        start.setHours(0,0,0,0);
        const ty = Math.floor((start.getTime() - s.getTime()) / DAY);
        t2 = ty;
      } else {
        for (var x=1;x<LENGTH;x++) {
          const s = new Date(habit.timeline[x]);
          s.setHours(0,0,0,0);
          const e = new Date(habit.timeline[x - 1]);
          e.setHours(0,0,0,0);
          const t = Math.floor((s.getTime() - e.getTime()) / DAY);
          if (t >= t1) {
            t1 = t;
          }
        }
        const l = LENGTH - 1;
        const s = new Date();
        s.setHours(0,0,0,0);
        const e = new Date(habit.timeline[l]);
        e.setHours(0,0,0,0);
        t2 = Math.floor((s.getTime() - e.getTime()) / DAY);
      }
    if (habit.type) {
      t1_str = `Longest Idle Day ${t1}`;
      t2_str = `Current Idle Day ${t2}`;
      if (t2 > 0) {
        progress = 0 / habit.target;
      } else {
        var i = 1;
        for(var x=(LENGTH-1);x>0;x--) {
          console.log(t1, t2);
          const s = new Date(habit.timeline[x]);
          s.setHours(0,0,0,0);
          const e = new Date(habit.timeline[x - 1]);
          e.setHours(0,0,0,0);
          const t = Math.floor((s.getTime() - e.getTime()) / DAY);
          if (t === 0) {
            i += 1;
          } else {
            break;
          }
        }
        progress = i / habit.target;
      }
    } else {
      t1_str = `Longest Restraint Day ${t1}`;
      t2_str = `Current Restraint Day ${t2}`;
      progress = t2 / habit.target;
    }
    return {
      '_1': ((habit.type ? 'Check-In' : 'Relapse') + ' Counter: ' + LENGTH.toString()),
      '_2': `Progress ${progress * 100}%`,
      '_3': t1_str,
      '_4': t2_str,
    }
  }

  const commitRelapseOrCheckIn = function(id) {
    return new Promise((resolve, reject) => {
      localforage.getItem(DATABASE)
      .then((DB) => {
        if (DB == null) {
          DB = {};
        }
        if (DB[id] == null) {
          return Promise.reject(`${id} not exist`);
        } else {
          const today = new Date();
          today.setHours(0,0,0,0);
          if (DB[id].timeline.length === 0) {
            DB[id].timeline.push(today.getTime());
            return localforage.setItem(DATABASE, DB);
          } else {
            const last = new Date(DB[id].timeline[DB[id].timeline.length - 1]);
            last.setHours(0,0,0,0);
            const t = Math.floor((today.getTime() - last.getTime()) / DAY);
            if (t === 0) {
              return Promise.reject(`Already Relapsed or Check-In`);
            } else {
              DB[id].timeline.push(today.getTime());
              return localforage.setItem(DATABASE, DB);
            }
          }
        }
        return Promise.reject(`Unknown Error`);
      })
      .then((UPDATED) => {
        state.setState(DATABASE, UPDATED);
        resolve(UPDATED[id]);
      })
      .catch((e) => {
        reject(e);
      })
    });
  }

  const viewReport = function($router, habit) {
    console.log('------------------------------------------------------');
    console.log('Name:', habit.name);
    console.log('Start', new Date(habit.start).toDateString());
    console.log('Target Days', habit.target);
    console.log(analyzeHabit(habit));
  }

  const home = new Kai({
    name: 'home',
    data: {
      title: 'home',
      habits: [],
      isEmpty: true,
    },
    verticalNavClass: '.homeNav',
    components: [],
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('Habit Tracker');
      this.$state.addStateListener(DATABASE, this.methods.listenState);
      this.methods.listenState(this.$state.getState(DATABASE));
    },
    unmounted: function() {
      this.$state.removeStateListener(DATABASE, this.methods.listenState);
    },
    methods: {
      listenState: function(data) {
        const _habits = [];
        for (var h in data) {
          _habits.push(data[h]);
        }
        if (this.verticalNavIndex > (_habits.length - 1)) {
          this.verticalNavIndex -= 1;
        }
        this.setData({
          isEmpty: _habits.length === 0,
          habits: _habits
        });
        this.methods.renderLCR();
      },
      selected: function(val) {
        console.log(val);
      },
      renderLCR: function() {
        if (this.$router.stack[this.$router.stack.length - 1].name !== 'home')
          return
        if (this.data.habits.length > 0) {
          this.$router.setSoftKeyText('Menu', 'SELECT', 'Action');
        } else {
          this.$router.setSoftKeyText('Menu', '', '');
        }
      }
    },
    softKeyText: { left: 'Menu', center: '', right: '' },
    softKeyListener: {
      left: function() {
        const menus = [
          { "text": "Track my habit" },
          { "text": "Help & Support" },
          { "text": "Exit" },
        ];
        this.$router.showOptionMenu('Menu', menus, 'Select', (selected) => {
          if (selected.text === 'Track my habit') {
            habitEditor(this.$router);
          } else if (selected.text === 'Help & Support') {
            
          } else if (selected.text === 'Exit') {
            window.close();
          }
        }, () => {
          setTimeout(() => {
            this.methods.renderLCR();
          }, 100);
        }, 0);
      },
      center: function() {
        const habit = this.data.habits[this.verticalNavIndex];
        if (habit) {
          viewReport(this.$router, habit);
        }
      },
      right: function() {
        const habit = this.data.habits[this.verticalNavIndex];
        if (habit) {
          const menus = [
            { "text": (habit.type ? 'Check-In' : 'Relapse') },
            { "text": "Delete" },
            { "text": "Update" },
            { "text": "Exit" },
          ];
          this.$router.showOptionMenu('Action', menus, 'Select', (selected) => {
            if (selected.text === 'Delete') {
              this.$router.showDialog('Delete', `Are you sure to remove ${habit.name} ?`, null, 'Yes', () => {
                localforage.getItem(DATABASE)
                .then((DB) => {
                  if (DB == null) {
                    DB = {};
                  }
                  delete DB[habit.id];
                  return localforage.setItem(DATABASE, DB);
                })
                .then((UPDATED) => {
                  this.$state.setState(DATABASE, UPDATED);
                  this.$router.showToast(`Deleted ${habit.name}`);
                });
              }, 'No', () => {}, ' ', null, () => {
                setTimeout(() => {
                  this.methods.renderLCR();
                }, 100);
              });
            } else if (selected.text === 'Update') {
              habitEditor(this.$router, habit);
            } else if (selected.text === 'Check-In' || selected.text === 'Relapse') {
              commitRelapseOrCheckIn(habit.id)
              .then((h) => {
                console.log(h);
              })
              .catch((e) => {
                console.log(e);
              });
            }
          }, () => {
            setTimeout(() => {
              this.methods.renderLCR();
            }, 100);
          }, 0);
        }
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        if (this.verticalNavIndex <= 0) {
          return
        }
        this.navigateListNav(-1);
        this.methods.renderLCR();
      },
      arrowRight: function() {
        // this.navigateTabNav(-1);
      },
      arrowDown: function() {
        if (this.verticalNavIndex === this.data.habits.length - 1) {
          return
        }
        this.navigateListNav(1);
        this.methods.renderLCR();
      },
      arrowLeft: function() {
        // this.navigateTabNav(1);
      },
    }
  });

  const router = new KaiRouter({
    title: 'Habit Tracker',
    routes: {
      'index': {
        name: 'home',
        component: home
      },
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }
});
