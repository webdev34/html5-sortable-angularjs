/*
  Author:bachvtuan@gmail.com
  https://github.com/bachvtuan/html5-sortable-angularjs
  A directive that support sortable list via html5 for angularjs
  Read the readme.md and take a look at example code before using.
*/

var sortable_app = angular.module('html5.sortable', []);
sortable_app.directive('htmlSortable', function($parse,$timeout, $log, $window) {

  //<Yalun: iOS Shim Code Start>
  coordinateSystemForElementFromPoint = navigator.userAgent.match(/OS 5(?:_\d+)+ like Mac/) ? "client" : "page";

  function DragDrop(event, el) {
    this.touchPositions = {};
    this.dragData = {};
    this.el = el || event.target
    event.preventDefault();
    this.dispatchDragStart();
    this.elTranslation = readTransform(this.el);
    this.listen();
  }
  function readTransform(el) {
    var transform = el.style["-webkit-transform"];
    var x = 0
    var y = 0
    var match = /translate\(\s*(\d+)[^,]*,\D*(\d+)/.exec(transform)
    if(match) {
      x = parseInt(match[1],10)
      y = parseInt(match[2],10)
    }
    return { x: x, y: y };
  }
  function average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((function(s, v) {
      return v + s;
    }), 0) / arr.length;
  }
  function onEvt(el, event, handler, context) {
    if(context) handler = handler.bind(context)
    el.addEventListener(event, handler);
    return {
      off: function() {
        return el.removeEventListener(event, handler);
      }
    };
  }
  function once(el, event, handler, context) {
    if(context) handler = handler.bind(context)
    function listener(evt) {
      handler(evt);
      return el.removeEventListener(event,listener);
    }
    return el.addEventListener(event,listener);
  }
  function elementFromTouchEvent(el,event) {
    var parent = el.parentElement;
    var next = el.nextSibling;
    parent.removeChild(el);

    var touch = event.changedTouches[0];
    target = document.elementFromPoint(
      touch[coordinateSystemForElementFromPoint + "X"], 
      touch[coordinateSystemForElementFromPoint + "Y"]
    );

    if(next) {
      parent.insertBefore(el, next);
    } else {
      parent.appendChild(el);
    }

    return target
  }
  DragDrop.prototype = {
    listen: function() {
      var move = onEvt(document, "touchmove", this.move, this);
      var end = onEvt(document, "touchend", ontouchend, this);
      var cancel = onEvt(document, "touchcancel", cleanup, this);

      function ontouchend(event) {
        this.dragend(event, event.target);
        cleanup();
      }
      function cleanup() {
        console.log("cleanup");
        this.touchPositions = {};
        this.el = this.dragData = null;
        return [move, end, cancel].forEach(function(handler) {
          return handler.off();
        });
      }
    },
    move: function(event) {
      var deltas = { x: [], y: [] };

      ;[].forEach.call(event.changedTouches,function(touch, index) {
        var lastPosition = this.touchPositions[index];
        if (lastPosition) {
          deltas.x.push(touch.pageX - lastPosition.x);
          deltas.y.push(touch.pageY - lastPosition.y);
        } else {
          this.touchPositions[index] = lastPosition = {};
        }
        lastPosition.x = touch.pageX;
        lastPosition.y = touch.pageY;
      }.bind(this))

      this.elTranslation.x += average(deltas.x);
      this.elTranslation.y += average(deltas.y);
      // this.el.style["transform-style"] = "flat";
      this.el.style.position= "relative"; //add this fixes the overlapping z-index issue when dragging
      //this.el.style.zIndex = "99999"; //Yalun
      this.el.style["-webkit-transform"] = "translate(" + this.elTranslation.x + "px," + this.elTranslation.y + "px)";
      this.el.classList.add('moving'); //Yalun

    },
    dragend: function(event) {

      // we'll dispatch drop if there's a target, then dragEnd. If drop isn't fired
      // or isn't cancelled, we'll snap back
      // drop comes first http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#drag-and-drop-processing-model
      console.log("dragend");

      var target = elementFromTouchEvent(this.el,event)

      if (target) {
        console.log("found drop target " + target);
        this.dispatchDrop(target);
      } else {
        console.log("no drop target, scheduling snapBack")
        once(document, "dragend", this.snapBack, this);
      }

      var dragendEvt = document.createEvent("Event");
      dragendEvt.initEvent("dragend", true, true);
      this.el.dispatchEvent(dragendEvt);
      this.el.classList.remove('moving'); //Yalun
    },
    dispatchDrop: function() {
      var snapBack = true;

      var dropEvt = document.createEvent("Event");
      dropEvt.initEvent("drop", true, true);
      dropEvt.dataTransfer = {
        getData: function(type) {
          return this.dragData[type];
        }.bind(this)
      };
      dropEvt.preventDefault = function() {
         // https://www.w3.org/Bugs/Public/show_bug.cgi?id=14638 - if we don't cancel it, we'll snap back
        this.el.style["z-index"] = ""; //Yalun
        this.el.style["pointer-events"] = "auto"; //Yalun
        snapBack = false;
        this.el.style["-webkit-transform"] = "translate(0,0)";
      }.bind(this);

      once(document, "drop", function() {
        console.log("drop event not canceled");
        if (snapBack) this.snapBack()
      },this);

      target.dispatchEvent(dropEvt);
    },
    snapBack: function() {
      once(this.el, "webkitTransitionEnd", function() {
        this.el.style["z-index"] = ""; //Yalun
        this.el.style["pointer-events"] = "auto"; //Yalun
        this.el.style["-webkit-transition"] = "none";
      },this);
      setTimeout(function() {
        this.el.style["-webkit-transition"] = "all 0.2s";
        this.el.style["-webkit-transform"] = "translate(0,0)";
      }.bind(this));
    },
    dispatchDragStart: function() {
      var evt = document.createEvent("Event");
      evt.initEvent("dragstart", true, true);
      evt.dataTransfer = {
        setData: function(type, val) {
          return this.dragData[type] = val;
        }.bind(this),
        dropEffect: "move"
      };
      this.el.dispatchEvent(evt);
    }
  }
  //</Yalun: iOS Shim Code Start>
  return {
    restrict: 'A',
    require: '?ngModel',
    scope: { 
      htmlSortable: '=',
      ngModel : '=',
      ngExtraSortable:'=',
      flag: '='  //Yalun added a onDrag flag to show the drop area only when dragging
    },

    //scope: true,   // optionally create a child scope
    link: function(scope, element, attrs,ngModel) {
      scope.flag = scope.flag || false
      var model = $parse(attrs.htmlSortable);
      /*attrs.html5Sortable*/
      var sortable = {};
      sortable.is_handle = false;
      sortable.in_use = false;
      
      sortable.handleDragStart = function(e) {
         $window['drag_source'] = null;
         $window['drag_source_extra'] = null;
        
        if ( sortable.options &&  !sortable.is_handle && sortable.options.handle ){
          console.log('dragStart');
          e.preventDefault();
          return;
        }

        sortable.is_handle  = false;
        e.dataTransfer.effectAllowed = 'move';
        //Fixed on firefox
        e.dataTransfer.setData('text/plain', 'anything');
        
         $window['drag_source'] = this;
         $window['drag_source_extra'] = element.extra_data;

        // this/e.target is the source node.
        this.classList.add('moving');
      };

      sortable.handleDragOver = function(e) {
        if (e.preventDefault) {
          e.preventDefault(); // Allows us to drop.
        }

        e.dataTransfer.dropEffect = 'move';
        
        if ( !this.classList.contains('over') ){
          this.classList.add('over');
        }

        //return false;
      };

      sortable.handleDragEnter = function(e) {
        if ( !this.classList.contains('over') ){
          this.classList.add('over');
        }
      };

      sortable.handleDragLeave = function(e) {
        this.classList.remove('over');
      };

      sortable.handleDrop = function(e) {
        console.log('handleDrop');

        // this/e.target is current target element.
        if (e.stopPropagation) {
          // stops the browser from redirecting.
          e.stopPropagation(); 
        }
        e.preventDefault();
        this.classList.remove('over');
        
        console.log( $window['drag_source'])
        // Don't do anything if we're dropping on the same column we're dragging.
        if ( $window['drag_source'] != this) {
          if ( $window['drag_source'] == null){

            $log.info("Invalid sortable");
            return;
          }

          
          var source_model = $window['drag_source'].model;
          var drop_index = this.index;

          if (ngModel.$modelValue.indexOf(source_model) != -1){
            
            var drag_index =  $window['drag_source'].index;
            var temp = angular.copy(ngModel.$modelValue[drag_index]);
            
            sortable.unbind();
            
            ngModel.$modelValue.splice(drag_index,1);
            ngModel.$modelValue.splice(drop_index,0, temp);

          }
          else if ( sortable.options.allow_cross ){
            ngModel.$modelValue.splice(drop_index,0, source_model);
          }
          else{
            $log.info("disabled cross dropping");
            return;
          }
          
          //return;
          scope.$apply();

          if ( sortable.options &&  angular.isDefined(sortable.options.stop) ){
            $log.info('Make callback');
            sortable.options.stop(ngModel.$modelValue,drop_index,
              element.extra_data,$window['drag_source_extra']);
          }
        }

        return false;
      };

      sortable.handleDragEnd = function(e) {
        // this/e.target is the source node.
        [].forEach.call(sortable.cols_, function (col) {
          col.classList.remove('over');
          col.classList.remove('moving');
        });

      };

      //Unbind all events are registed before
      sortable.unbind = function(){
        
        $log.info('Unbind sortable');
        [].forEach.call(sortable.cols_, function (col) {
          col.removeAttribute('draggable');
          col.removeEventListener('dragstart', sortable.handleDragStart, false);
          col.removeEventListener('dragenter', sortable.handleDragEnter, false);
          col.removeEventListener('dragover', sortable.handleDragOver, false);
          col.removeEventListener('dragleave', sortable.handleDragLeave, false);
          col.removeEventListener('drop', sortable.handleDrop, false);
          col.removeEventListener('dragend', sortable.handleDragEnd, false);
        });
        sortable.in_use = false;
      }

      sortable.activehandle = function(){
        scope.flag = true; //set onDrag flag to true when you actually started to drag
        console.log('handle is true');
        sortable.is_handle = true;
        sortable.update();

      }
      sortable.touchhandle = function(e){
        if (this === event.target){
          scope.flag = true; //set onDrag flag to true when you actually started to drag
          e.preventDefault();
          var el = e.target;
          console.log('touch handle');
          sortable.is_handle = true;
          new DragDrop(e, el.parentNode.parentNode.parentNode.parentNode); 
          //el is the handle, 4th parent is the element I want to drag
        } 
      }

      sortable.register_drop = function(element_children){
        element_children.addEventListener('dragstart', sortable.handleDragStart, false);
        element_children.addEventListener('dragenter', sortable.handleDragEnter, false);
        element_children.addEventListener('dragover', sortable.handleDragOver, false);
        element_children.addEventListener('dragleave', sortable.handleDragLeave, false);
        element_children.addEventListener('drop', sortable.handleDrop, false);
        element_children.addEventListener('dragend', sortable.handleDragEnd, false);
      }

      sortable.update = function(){
        // console.log('Update sortable');
        $window['drag_source'] = null;
        var index = 0;
        
        //This's empty list, so just need listen drop from other
        if ( ngModel.$modelValue.length == 0 ){
          if (element[0].children.length >0){
            //Set index = 0( simulate first index )
            element[0].children[0].index = 0;
            sortable.register_drop(element[0].children[0]);
          }
          return;
        }
        this.cols_ =  element[0].children;

        [].forEach.call(this.cols_, function (col) {
          if ( sortable.options &&  sortable.options.handle){
            var handle = col.querySelectorAll(sortable.options.handle)[0];
            handle.addEventListener('mousedown', sortable.activehandle, false);
            handle.addEventListener('touchstart', sortable.touchhandle, false);
          }
          
          col.index = index;
          col.model = ngModel.$modelValue[index];

          index++;

          col.setAttribute('draggable', 'true');  // Enable columns to be draggable.
          sortable.register_drop(col);
        });

        sortable.in_use = true;
      }
      
      if (ngModel) {
        ngModel.$render = function() {
          $timeout(function(){
            //Init flag indicate the first load sortable is done or not
            sortable.first_load = false;

            scope.$watch('ngExtraSortable',function(value){
              element.extra_data = value;
              //sortable.extra_data = value;
            });
            
            scope.$watch('htmlSortable', function(value) {
              
              sortable.options = angular.copy(value) ;

              if (value == "destroy" ){
                if (sortable.in_use){
                  sortable.unbind();
                  sortable.in_use = false;
                }
                return;
              }

              if ( !angular.isDefined(sortable.options)){
                sortable.options = {};
              }

              if ( !angular.isDefined(sortable.options.allow_cross)){
                sortable.options.allow_cross = false
              }

              if ( angular.isDefined(sortable.options.construct) ){
                sortable.options.construct(ngModel.$modelValue);
              }

              element[0].classList.add('html5-sortable');
              sortable.update();
              $timeout(function(){
                sortable.first_load = true;
              })
            }, true);

            //Watch ngModel and narrate it
            scope.$watch('ngModel', function(value) {
              if ( !sortable.first_load || sortable.options == 'destroy' ){
                //Ignore on first load
                return;
              }
              
              $timeout(function(){
                sortable.update();
              });

            },true);

          });
        };
      }
      else{
        $log.info('Missing ng-model in template');
      }
    }
  };
});