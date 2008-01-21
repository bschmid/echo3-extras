/**
 * Synchronization peer for TransitionPane.
 */
ExtrasRender.ComponentSync.TransitionPane = Core.extend(EchoRender.ComponentSync, {

    $load: function() {
        EchoRender.registerPeer("ExtrasApp.TransitionPane", this);
    },

    element: null,
    type: null,
    _duration: null,
    _transition: null,
    _transitionClass: null,
    _runnable: null,
    
    /**
     * The element containing the old child element, which is being transitioned FROM.
     */
    oldChildDivElement: null,
    
    /**
     * The element containing the current/new child element, which is being transitioned TO.
     */
    childDivElement: null,
    
    /**
     * Flag indicating whether initial content has been loaded (no transition effect is ued on the first load).
     */
    _initialContentLoaded: false,

    $construct: function() {
    },
    
    doImmediateTransition: function() {
        this._removeOldContent();
        if (this.childDivElement) {
            this.childDivElement.style.display = "block";
        }
    },

    _loadTransition: function() {
        this.type = this.component.getRenderProperty("type");
        switch (this.type) {
        case ExtrasApp.TransitionPane.TYPE_FADE:
            this._transitionClass = ExtrasRender.ComponentSync.TransitionPane.FadeOpacityTransition;
            break;
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_DOWN:
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_LEFT:
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_RIGHT:
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_UP:
            this._transitionClass = ExtrasRender.ComponentSync.TransitionPane.CameraPanTransition;
            break;

        default:
            this._transitionClass = null;
            this._duration = null;
        }
    },
    
    _removeOldContent: function() {
        if (this.oldChildDivElement) {
            this.element.removeChild(this.oldChildDivElement);
            this.oldChildDivElement = null;
        }
    },

    renderAdd: function(update, parentElement) {
        this._loadTransition();
        this.element = document.createElement("div");
        this.element.style.cssText = "position:absolute;overflow:hidden;top:0;left:0;width:100%;height:100%;";
        parentElement.appendChild(this.element);
        if (this.component.children.length > 0) {
            this._renderAddChild(update);
        }
    },
    
    _renderAddChild: function(update) {
        this.childDivElement = document.createElement("div");
        this.childDivElement.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;";
        
        EchoRender.renderComponentAdd(update, this.component.children[0], this.childDivElement);
        
        if (this._initialContentLoaded) {
            this.childDivElement.style.display = "none";
            if (this._transitionClass) {
                this._transitionStart();
            } else {
                this.doImmediateTransition();
            }
        } else {
            this._initialContentLoaded = true;
        }

        this.element.appendChild(this.childDivElement);
    },
    
    renderDisplay: function() {
        
    },
    
    renderDispose: function(update) {
        this._transitionFinish();
        this._childDivElement = null;
        this.element = null;
    },

    renderUpdate: function(update) {
        var fullRender = false;
        if (update.hasUpdatedProperties() || update.hasUpdatedLayoutDataChildren()) {
            // Full render
            fullRender = true;
        } else {
            this._transitionFinish();
        
            var removedChildren = update.getRemovedChildren();
            if (removedChildren) {
                // Remove children.
                this.oldChildDivElement = this.childDivElement;
                this.childDivElement = null;
            }
            var addedChildren = update.getAddedChildren();
            if (update.parent.children > 1) {
                throw new Error("Cannot render more than one child in a TransitionPane.");
            }
            
            if (addedChildren) {
                // Add children.
                this._renderAddChild(update); 
            }
        }
        if (fullRender) {
            var element = this.element;
            var containerElement = element.parentNode;
            EchoRender.renderComponentDispose(update, update.parent);
            containerElement.removeChild(element);
            this.renderAdd(update, containerElement);
        }
        
        return fullRender;
    },
    
    _transitionStart: function() {
        this._transition = new this._transitionClass(this);
        this._duration = this.component.getRenderProperty("duration", this._transition.duration);
        this._runnable = new ExtrasRender.ComponentSync.TransitionPane.Runnable(this);
        Core.Scheduler.add(this._runnable); 
    },
    
    /**
     * Finishes the transition.  This method is invoked by the runnable when the transition is completed,
     * or by the synchronization peer itself if a second transition is required before the first transition has completed.
     */
    _transitionFinish: function() {
        // Remove runnable task from scheduler.
        if (this._runnable) {
            Core.Scheduler.remove(this._runnable);
            this._runnable = null;
        }
        
        // Inform transition to finish immediately.
        if (this._transition) {
            this._transition.finish();
            this.transition = null;
        }
        
        // Remove content which was transitioned from.
        this._removeOldContent();
    }
});

ExtrasRender.ComponentSync.TransitionPane.Runnable = Core.extend(Core.Scheduler.Runnable, {

    transitionPane: null,

    timeInterval: null,
    
    _startTime: null,
    
    _endTime: null,
    
    repeat: true,
    
    _initialized: false,
    
    $construct: function(transitionPane) {
        this.transitionPane = transitionPane;
        this.timeInterval = transitionPane._transition.stepInterval;
    },
    
    run: function() {
        if (!this.initialized) {
            this._startTime = new Date().getTime();
            this._endTime = this._startTime + this.transitionPane._duration;
            this.transitionPane._transition.start();
            this.initialized = true;
        } else {
            var time = new Date().getTime();
            if (time < this._endTime) {
                var progress = (time - this._startTime) / this.transitionPane._duration;
                this.transitionPane._transition.step(progress);
            } else {
                this.transitionPane._transitionFinish();
            }
        }
    }
}); 

/**
 * Abstract base class for transition implementations.
 */
ExtrasRender.ComponentSync.TransitionPane.Transition = Core.extend({

    transitionPane: null,

    $virtual: {
    
        /**
         * Duration of the transition, in milliseconds.
         * This value should be overridden when a custom duration time is desired.
         * This value will automatically be overridden if the TransitionPane component
         * has its "duration" property set.
         * @type Number
         */
        duration: 350,
        
        /**
         * Interval at which transition steps should be invoked, in milliseconds.
         * @type Number
         */
        stepInterval: 10
    },

    $abstract: {
    
        /**
         * Finishes the transition.
         */
        finish: function() { },
        
        /**
         * Starts the transition.
         */
        start: function() { },
        
        /**
         * Renders a step of the transition.
         * 
         * @param {Number} value between 0 and 1 indicating the progress of the transition which should be displayed.
         */
        step: function(progress) { }
    },

    $construct: function(transitionPane) {
        this.transitionPane = transitionPane;
    }
});

ExtrasRender.ComponentSync.TransitionPane.CameraPanTransition = Core.extend(
        ExtrasRender.ComponentSync.TransitionPane.Transition, {
        
    _newChildOnScreen: false,
    
    _travel: null,

    finish: function() {
        if (this.transitionPane.childDivElement) {
            this.transitionPane.childDivElement.style.zIndex = 0;
            this.transitionPane.childDivElement.style.top = "0px";
            this.transitionPane.childDivElement.style.left = "0px";
        }
    },
    
    start: function() {
        var bounds = new WebCore.Measure.Bounds(this.transitionPane.element);
        this._travel = (this.transitionPane.type == ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_DOWN 
                || this.transitionPane.type == ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_UP)
                ? bounds.height : bounds.width;
        if (this.transitionPane.oldChildDivElement) {
            this.transitionPane.oldChildDivElement.style.zIndex = 1;
        }
    },
    
    step: function(progress) {
        switch (this.transitionPane.type) {
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_DOWN:
            if (this.transitionPane.childDivElement) {
                this.transitionPane.childDivElement.style.top = ((1 - progress) * this._travel) + "px";
            }
            if (this.transitionPane.oldChildDivElement) {
                this.transitionPane.oldChildDivElement.style.top = (0 - (progress * this._travel)) + "px";
            }
            break;
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_UP:
            if (this.transitionPane.childDivElement) {
                this.transitionPane.childDivElement.style.top = (0 - ((1 - progress) * this._travel)) + "px";
            }
            if (this.transitionPane.oldChildDivElement) {
                this.transitionPane.oldChildDivElement.style.top = (progress * this._travel) + "px";
            }
            break;
        case ExtrasApp.TransitionPane.TYPE_CAMERA_PAN_RIGHT:
            if (this.transitionPane.childDivElement) {
                this.transitionPane.childDivElement.style.left = ((1 - progress) * this._travel) + "px";
            }
            if (this.transitionPane.oldChildDivElement) {
                this.transitionPane.oldChildDivElement.style.left = (0 - (progress * this._travel)) + "px";
            }
            break;
        default:
            if (this.transitionPane.childDivElement) {
                this.transitionPane.childDivElement.style.left = (0 - ((1 - progress) * this._travel)) + "px";
            }
            if (this.transitionPane.oldChildDivElement) {
                this.transitionPane.oldChildDivElement.style.left = (progress * this._travel) + "px";
            }
            break;
        }
        if (!this._newChildOnScreen && this.transitionPane.childDivElement) {
            this.transitionPane.childDivElement.style.display = "block";
            this.transitionPane.childDivElement.style.zIndex = 2;
            this._newChildOnScreen = true;
        }
    }
});

ExtrasRender.ComponentSync.TransitionPane.FadeOpacityTransition = Core.extend(
        ExtrasRender.ComponentSync.TransitionPane.Transition, {
    
    duration: 1000,
    
    finish: function() {
        if (this.transitionPane.childDivElement) {
            this.transitionPane.childDivElement.style.zIndex = 0;
            if (WebCore.Environment.PROPRIETARY_IE_OPACITY_FILTER_REQUIRED) {
                this.transitionPane.childDivElement.style.filter = "";
            } else {
                this.transitionPane.childDivElement.style.opacity = 1;
            }
        }
    },
    
    start: function() {
        if (this.transitionPane.childDivElement) {
            if (WebCore.Environment.PROPRIETARY_IE_OPACITY_FILTER_REQUIRED) {
                this.transitionPane.childDivElement.style.filter = "alpha(opacity=0)";
            } else {
                this.transitionPane.childDivElement.style.opacity = 0;
            }
        }
        this.transitionPane.childDivElement.style.display = "block";
    },
    
    step: function(progress) {
        if (this.transitionPane.childDivElement) {
            if (WebCore.Environment.PROPRIETARY_IE_OPACITY_FILTER_REQUIRED) {
                var percent = parseInt(progress * 100);
                this.transitionPane.childDivElement.style.filter = "alpha(opacity=" + percent + ")";
            } else {
                this.transitionPane.childDivElement.style.opacity = progress;
            }
        } else if (this.transitionPane.oldChildDivElement) {
            if (WebCore.Environment.PROPRIETARY_IE_OPACITY_FILTER_REQUIRED) {
                var percent = parseInt((1 - progress) * 100);
                this.transitionPane.oldChildDivElement.style.filter = "alpha(opacity=" + percent + ")";
            } else {
                this.transitionPane.oldChildDivElement.style.opacity = 1 - progress;
            }
        }
    }
});