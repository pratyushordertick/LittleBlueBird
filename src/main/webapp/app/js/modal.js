
angular.module('angularBootstrap', ['angularBootstrap.modal']);

angular.module('angularBootstrap.modal', [])
.directive('bootstrapModal', function($rootScope) {

    var escapeEvent, openEvent, closeEvent, linkFn;

    //Default directiveOpts
    var defaults = {
        backdrop: true,
        escapeExit: true,
        effect: null,
        effectTime: '250',
    };

    linkFn = function(scope, element, attrs) {
        //So when a modal is opened with an effect, it knows what to close it with
        var currentEffect = {};

        var directiveOpts = angular.extend(defaults, attrs);
        directiveOpts.effectTime = parseInt(directiveOpts.effectTime);

        //Escape event has to be declared so that when modal closes,
        //we only unbind modal escape and not everything
        escapeEvent = function(e) {
            if (e.which == 27) 
                closeEvent();
        };

        //Opens the modal
        openEvent = function(event, options) {
            var modalTop; //for slide effect

            //.modal child of the bootstrap-modal element is the actual div we want to control
            var modalElm = jQuery('.modal', element);

            //Fall back on directive options for parameters not given
            options = angular.extend(directiveOpts, options || {});

            //Assign currentEffect object so closeModal knows the effect
            currentEffect = { effect: options.effect, time: options.effectTime };

            //If there's an on-open attribute, call the function
            if (scope.onOpen !== undefined && scope.onOpen !== null)
                $rootScope.$apply(function() { 
                    scope.onOpen(attrs.id);
                });

            //Make click on backdrop close modal
            if (options.backdrop === true || options.backdrop === "true") {
                //If no backdrop el, have to add it
                if (!document.getElementById('modal-backdrop'))
                    jQuery('body').append('<div id="modal-backdrop" class="modal-backdrop"></div>')
                jQuery('#modal-backdrop')
                    .css({ display: 'block' })
                    .bind('click', closeEvent);
            }
            //Make escape close modal unless set otherwise
            if (options.escapeExit === true || options.escapeExit === "true")
                jQuery('body').bind('keyup', escapeEvent);
            
            jQuery('body').addClass('modal-open');
            jQuery('.modal-close', modalElm).bind('click', closeEvent);

            if (currentEffect.effect === 'fade') {
                modalElm.fadeIn(currentEffect.time);
                
            } else if (currentEffect.effect === 'slide') {
                //Slide modal from top. have to hide it at top first
                modalTop = modalElm.css('top')
                modalElm.css({ top: '-30%', display: 'block' })
                    .animate({ top: modalTop }, currentEffect.time)
            } else {
                modalElm.css({ display: 'block' });
            }
        };
        
        //Closes the modal
        closeEvent = function(event) {
            //.modal child of the bootstrap-modal element is the actual div we want to control
            var modalElm = jQuery('.modal', element);
            var modalTop; //for slide

            //Call onClose function if it was set
            if (scope.onClose !== undefined && scope.onClose !== null)
                $rootScope.$apply(function() {
                    scope.onClose(attrs.id);
                });

            if (currentEffect.effect === 'fade') {
                modalElm.fadeOut(currentEffect.time, function() {
                    modalElm.css({ display: 'none' });
                });
            } else if (currentEffect.effect === 'slide') {
                modalTop = modalElm.css('top');
                modalElm.animate({ top: '-30%' }, currentEffect.time, function() {
                    modalElm.css({ display: 'none', top: modalTop });
                });
            } else {
                modalElm.css({ display: 'none' });
            }

            jQuery('#modal-backdrop').unbind('click', closeEvent).css({ display: 'none' });
            jQuery('body').unbind('keyup', escapeEvent).removeClass('modal-open');
        };

        //Bind modalOpen and modalClose events, so outsiders can trigger the modal
        element.bind('modalOpen', openEvent).bind('modalClose', closeEvent);

    }

    return {
        link: linkFn,
        restrict: 'E',
        scope: {
            id: '@',
            onOpen: '=',
            onClose: '=',
        },
        template: '<div class="modal hide"><div ng-transclude></div></div>',
        transclude: true
    };
})
.factory('bootstrapModal', function() {
    return {
        show: function(modalId, options) {
            jQuery('#'+modalId).trigger('modalOpen', [options]);
        },
        hide: function(modalId) {
            jQuery('#'+modalId).trigger('modalClose');
        }
    }
});

function ModalCtrl($scope, bootstrapModal) {
	$scope.opts = "none"
	$scope.effect = '';
	$scope.effectTime = "250";

	$scope.openModal = function(name) {
		bootstrapModal.show(name, 
		{	backdrop: $scope.opts == "both" || $scope.opts == "backdrop",
			escapeExit: $scope.opts == "both" || $scope.opts == "escape",
			effect: $scope.effect, 
			effectTime: parseInt( $scope.effectTime )
		});
	};
};
