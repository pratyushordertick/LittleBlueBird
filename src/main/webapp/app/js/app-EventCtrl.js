
function EventCtrl($rootScope, $scope, $route, Circle, CircleParticipant) {

  $rootScope.activeitem = 'events';
  
  $scope.$on("$routeChangeSuccess", 
    function( scope, newRoute ){
      // Create a render() function and put the stuff below in that
      //render();
      console.log("newRoute.params.circleId="+newRoute.params.circleId);
      if(angular.isDefined(newRoute.params.circleId)) {
        for(var i=0; i < $rootScope.user.circles.length; i++) {
          if($rootScope.user.circles[i].id == newRoute.params.circleId) {
            $rootScope.circle = $rootScope.user.circles[i];
            $rootScope.circle.participants = CircleParticipant.query({circleId:$rootScope.circle.id});
          }
        }
      }
      
      console.log("app-EventCtrl: routeChangeSuccess -----------------------------");
      
      // THIS IS KINDA DUMB...
      if(angular.isDefined($rootScope.circle)) {
        $rootScope.circle.participants = CircleParticipant.query({circleId:$rootScope.circle.id}, 
            function() {
                console.log("app-EventCtrl: routeChangeSuccess:  $rootScope.circle.participants.....");
                console.log($rootScope.circle.participants);
            
		        // the only reason that I'm combining the givers and receivers here is so that I can 
		        // tell where the last row is on event.html  Otherwise, all I know is that I have a collection
		        // of givers and another collection of receivers and I can only tell where the last row 
		        // of each group is.
		        $rootScope.circle.participants.both = [];
		        for(var i=0; i < $rootScope.circle.participants.receivers.length; i++) {
		          var p = $rootScope.circle.participants.receivers[i];
		          p.isReceiver = true;
		          $rootScope.circle.participants.both.push(p);
		        }
		        for(var i=0; i < $rootScope.circle.participants.givers.length; i++) {
		          var p = $rootScope.circle.participants.givers[i];
		          p.isGiver = true;
		          $rootScope.circle.participants.both.push(p);
		        }
                console.log("app-EventCtrl: routeChangeSuccess:  $rootScope.circle.participants.both.....");
                console.log($rootScope.circle.participants.both);
                
            } // success function of CircleParticipant.query
        ); // CircleParticipant.query
        
      } // if(angular.isDefined($rootScope.circle)) 
    }
  );
  
  $scope.newcircleFunction = function(thetype, limit) {
    $scope.search = '';
    $rootScope.peoplesearchresults = [];
    Circle.circleType = thetype;
    $scope.newcircle = {name:'', creatorId:$rootScope.user.id, receiverLimit:limit, participants:{receivers:[], givers:[]}};
    $scope.circlecopies = angular.copy($rootScope.user.circles);
  }
  
  $scope.getType = function() {return Circle.circleType;}
  
  $scope.canaddreceiver = function(circle) {
    var isdefined = angular.isDefined(circle) && angular.isDefined(circle.receiverLimit) && angular.isDefined(circle.participants.receivers)
    return isdefined && (circle.receiverLimit == -1 || circle.receiverLimit > circle.participants.receivers.length);
  }
  
  // TODO add reminder
  $scope.addmyselfasreceiver = function(circle) {
    $scope.addparticipant2($rootScope.user, circle, 'Receiver');
    // if 'you' happen to be a 'giver', remove yourself from 'givers'...
    for(var i=0; i < circle.participants.givers.length; i++) {
      if(circle.participants.givers[i].id == $rootScope.user.id)
        circle.participants.givers.splice(i, 1);
    }
  }
  
  // when you're creating a new user and then immediately adding them to the circle
  $scope.addparticipant2 = function(person, circle, participationlevel) {
    $scope.addparticipant(-1, person, circle, participationlevel);
  }
    
  $scope.addparticipant = function(index, person, participationlevel) {
    console.log("$scope.addparticipant = function(index, person, participationlevel):  participationlevel="+participationlevel);
    var level = participationlevel;
    if(participationlevel == 'Giver') {
      $rootScope.circle.participants.givers.push(person);
      level = 'Giver';
    }
    else if($scope.canaddreceiver($rootScope.circle)) {
      $rootScope.circle.participants.receivers.push(person);
      level = 'Receiver';
    }
    else {
      $rootScope.circle.participants.givers.push(person);
      level = 'Giver';
    }
    
    if(index != -1) {
      console.log("index = "+index);
      $rootScope.peoplesearchresults[index].hide = true;
    }
    
    // if the circle already exists, add the participant to the db immediately
    if(angular.isDefined($rootScope.circle.id)) {
      console.log("$scope.addparticipant:  $rootScope.user.id="+$rootScope.user.id);
      var newcp = CircleParticipant.save({circleId:$rootScope.circle.id, inviterId:$rootScope.user.id, userId:person.id, participationLevel:level,
                                         who:person.fullname, notifyonaddtoevent:person.notifyonaddtoevent, email:person.email, circle:$rootScope.circle.name, 
                                         adder:$rootScope.user.fullname},
                                         function() {$rootScope.circle.reminders = Reminder.query({circleId:$rootScope.circle.id})});
    }
  }
  
  // TODO duplicated in ManagePeopleCtrl
  $scope.removereceiver = function(index, circle, participant) {
    circle.participants.receivers.splice(index, 1)
    if(angular.isDefined(circle.id)) {
      CircleParticipant.delete({circleId:circle.id, userId:participant.id}, function() {Reminder.delete({circleId:$rootScope.circle.id, userId:participant.id})});
      // now remove person from circle.reminders...
      removeremindersforperson(participant);
    }
  }
  
  // TODO duplicated in ManagePeopleCtrl
  function removeremindersforperson(person) {
    $rootScope.circle.newreminders = [];
    for(var i=0; i < $rootScope.circle.reminders.length; i++) {
      if($rootScope.circle.reminders[i].viewer != person.id) {
        $rootScope.circle.newreminders.push(angular.copy($rootScope.circle.reminders[i]));
        console.log($rootScope.circle.reminders[i]);
      }
    }
    $rootScope.circle.reminders = angular.copy($rootScope.circle.newreminders);
  }
  
  // TODO add reminder
  $scope.addmyselfasgiver = function(circle) {
    $scope.addparticipant2($rootScope.user, circle, 'Giver')
    // if 'you' happen to be a 'receiver', remove yourself from 'receivers'...
    for(var i=0; i < circle.participants.receivers.length; i++) {
      if(circle.participants.receivers[i].id == $rootScope.user.id)
        circle.participants.receivers.splice(i, 1);
    }
  }
  
  // TODO duplicated in ManagePeopleCtrl
  $scope.removegiver = function(index, circle, participant) {
    circle.participants.givers.splice(index, 1)
    if(angular.isDefined(circle.id)) {
      CircleParticipant.delete({circleId:circle.id, userId:participant.id}, function() {Reminder.delete({circleId:$rootScope.circle.id, userId:participant.id})});
      // now remove person from circle.reminders...
      removeremindersforperson(participant);
    }
  }
    
  $scope.beginnewuser = function() {
    $scope.addmethod = 'createaccount';
    $scope.newuser = {};
    console.log("app-EventCtrl:  beginnewuser:  $scope.addmethod="+$scope.addmethod);
  } 
    
  // I think circle in this case is always(?) 'newcircle' and that the other overload of this function (where we don't pass in a circle) uses $rootScope.circle
  // This function here was created because $rootScope.circle doesn't exist yet.  We're in the process of creating this circle when we reach this function
  $scope.addparticipant = function(index, person, circle, participationlevel) {
    console.log("$scope.addparticipant = function(index, person, circle, participationlevel) ------------------------------------");
    if(!angular.isDefined(circle.participants))
      circle.participants = {receivers:[], givers:[]};
    if(participationlevel == 'Giver')
      circle.participants.givers.push(person);
    else if(circle.receiverLimit == -1) { // no limit on receivers
      circle.participants.receivers.push(person);
    }
    else {
      if(circle.participants.receivers.length < circle.receiverLimit)
        circle.participants.receivers.push(person);
      else  circle.participants.givers.push(person);
    }
    
    if(index != -1) {
      console.log("index = "+index);
      $rootScope.peoplesearchresults[index].hide = true;
    }
    
    // if the circle already exists, add the participant to the db immediately
    if(angular.isDefined(circle.id)) {
      console.log("$scope.addparticipant:  $rootScope.user.id="+$rootScope.user.id);
      var newcp = CircleParticipant.save({circleId:circle.id, inviterId:$rootScope.user.id, userId:person.id, participationLevel:participationlevel,
                                         who:person.fullname, notifyonaddtoevent:person.notifyonaddtoevent, email:person.email, circle:circle.name, adder:$rootScope.user.fullname},
                                         function() {$rootScope.circle.reminders = Reminder.query({circleId:$rootScope.circle.id})});
    }
  }
  
  // add all the participants in the 'fromcircle' to the 'tocircle'
  $scope.addparticipants = function(fromcircle, tocircle) {
    for(var i=0; i < fromcircle.participants.receivers.length; i++) {
      var hasLimit = angular.isDefined(tocircle.receiverLimit) && tocircle.receiverLimit != -1;
      if(hasLimit && tocircle.participants.receivers.length == tocircle.receiverLimit)
        tocircle.participants.givers.push(fromcircle.participants.receivers[i]);
      else tocircle.participants.receivers.push(fromcircle.participants.receivers[i]);
    }
    for(var i=0; i < fromcircle.participants.givers.length; i++) {
      if(!angular.isDefined(tocircle.receiverLimit) || tocircle.receiverLimit == -1)
        tocircle.participants.receivers.push(fromcircle.participants.givers[i]);
      else
        tocircle.participants.givers.push(fromcircle.participants.givers[i]);
    }
  }
    
  $scope.cancelnewcircle = function() {
    $rootScope.circle = {participants:[]};
    $scope.expdate = undefined;
  }
 
  $scope.savecircle = function(circle, expdate) {
    console.log("expdate = "+expdate);
    circle.expirationdate = new Date(expdate);
    console.log("circle.expirationdate.getTime() = "+circle.expirationdate.getTime());
    var savedcircle = Circle.save({circleId:circle.id, name:circle.name, expirationdate:circle.expirationdate.getTime(), circleType:Circle.circleType, 
                 participants:circle.participants, creatorId:circle.creatorId},
                 function() {
                   if(!angular.isDefined(circle.id))
                     $rootScope.user.circles.push(savedcircle); 
                   //User.currentUser=$rootScope.user; 
                   //$rootScope.$emit("userchange"); // commented out on 11/30/12 - experimenting
                 } 
               );
    console.log("end of $scope.savecircle()");
  }
}