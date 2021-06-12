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
    console.log(habit);
    var date = habit ? new Date(habit.start) : new Date();

    $router.push(
      new Kai({
        name: 'editorHabit',
        data: {
          name: habit ? habit.name : '',
          type: habit ? (habit.type ? 'Positive' : 'Negative') : 'Positive',
          start: date.toLocaleDateString(),
          target: habit ? habit.target : '',
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
                timeline: habit ? habit.timeline : [],
                target: JSON.parse(this.data.target) || 0
              }
              console.log(_habit.target, this.data.target);
              console.log(_habit);
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
          { "text": "Track new habit" },
          { "text": "Help & Support" },
          { "text": "Exit" },
        ];
        this.$router.showOptionMenu('Menu', menus, 'Select', (selected) => {
          if (selected.text === 'Track new habit') {
            habitEditor(this.$router);
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
          console.log(habit);
        }
      },
      right: function() {
        const habit = this.data.habits[this.verticalNavIndex];
        if (habit) {
          const menus = [
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
