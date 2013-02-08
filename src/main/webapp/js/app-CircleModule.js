
angular.module('CircleModule', [])
.factory('Circle', function($resource) {
      var Circle = $resource('/gf/rest/circles/:circleId', {circleId:'@circleId', circleType:'@circleType', name:'@name', expirationdate:'@expirationdate', creatorId:'@creatorId', participants:'@participants', datedeleted:'@datedeleted'}, 
                    {
                      query: {method:'GET', isArray:false}, 
                      activeEvents: {method:'GET', isArray:true}, 
                      expiredEvents: {method:'GET', isArray:true},
                      save: {method:'POST'}
                    });
      console.log("CircleModule:  created Circle factory");              
      return Circle;
  })
.factory('CircleParticipant', function($resource) {
      var CircleParticipant = $resource('/gf/rest/circleparticipants/:circleId', {circleId:'@circleId', userId:'@userId', inviterId:'@inviterId', 
                                         participationLevel:'@participationLevel', who:'@who', email:'@email', circle:'@circle', adder:'@adder',
                                         notifyonaddtoevent:'@notifyonaddtoevent'}, 
                    {
                      query: {method:'GET', isArray:false}, 
                      delete: {method:'DELETE'},
                      save: {method:'POST'}
                    });

      return CircleParticipant;
  })
.factory('EventHelper', function($rootScope) {

    var eventtypes = [{type:'Christmas', limit:-1},
                {type:'Birthday', limit:1},
                {type:'Anniversary', limit:2},
                {type:'Mothers Day', limit:1},
                {type:'Fathers Day', limit:1},
                {type:'Valentines Day', limit:-1},
                {type:'Graduation', limit:1},
                {type:'Baby Shower', limit:1},
                {type:'Other', limit:-1}];
                
    var EventHelper = {};
    
    EventHelper.getEventType = function(newRoute) {
      var thetype = newRoute.params.type;
      var typeInfo = {type:'Other', limit:-1}; // default values
      for(var i=0; i < eventtypes.length; i++) {
        if(eventtypes[i].type == thetype) {
          console.log("app-CircleModule: EventHelper.createNewEvent(): FOUND eventtypes["+i+"].type = "+eventtypes[i].type+", eventtypes["+i+"].limit = "+eventtypes[i].limit);
          typeInfo = eventtypes[i];
        }
      }
      
      return typeInfo;
    }
    
    return EventHelper; 
                
  })
.run(function($rootScope, $location, EventHelper) {
  
    // See events.html:  #/newevent/Christmas,Birthday,etc
    // This event is fired all the time, so make sure the url contains 'newevent' to proceed
    $rootScope.$on('$routeChangeStart', function(scope, newRoute){ 
    
      if ($location.url().indexOf('newevent') == -1) {
        return;
      }
    
      console.log("app-CircleModule:run():routeChangeStart:  This is our 'new event' function.  newRoute = .....");
      console.log(newRoute);
      $rootScope.typeInfo = EventHelper.getEventType(newRoute);
      $rootScope.search = '';
      $rootScope.peoplesearchresults = [];
      $rootScope.newcircle = {name:'', circleType:$rootScope.typeInfo.type, receiverLimit:$rootScope.typeInfo.limit, participants:{receivers:[], givers:[]}};
    })
    
  })
.run(function($rootScope, $location, Circle, CircleParticipant, Reminder, UserSearch, Gift, Reminder) {

  // define $rootScope functions here to make them globally available
    
  $rootScope.canaddreceiver = function(circle) {
    //console.log("$rootScope.canaddreceiver:  circle=....");
    //console.log(circle);
    var isdefined = angular.isDefined(circle) && angular.isDefined(circle.receiverLimit) && angular.isDefined(circle.participants.receivers)
    return isdefined && (circle.receiverLimit == -1 || circle.receiverLimit > circle.participants.receivers.length);
  }
  
  
  $rootScope.addmyselfasreceiver = function(circle) {
    $rootScope.addparticipant(-1, $rootScope.user, circle, 'Receiver');
    // if 'you' happen to be a 'giver', remove yourself from 'givers'...
    for(var i=0; i < circle.participants.givers.length; i++) {
      if(circle.participants.givers[i].id == $rootScope.user.id)
        circle.participants.givers.splice(i, 1);
    }
  } 
  
  
  // TODO add reminder
  $rootScope.addmyselfasgiver = function(circle) {
    $rootScope.addparticipant(-1, $rootScope.user, circle, 'Giver');
    // if 'you' happen to be a 'receiver', remove yourself from 'receivers'...
    for(var i=0; i < circle.participants.receivers.length; i++) {
      if(circle.participants.receivers[i].id == $rootScope.user.id)
        circle.participants.receivers.splice(i, 1);
    }
  }
  
  
  // also referenced from events.html
  $rootScope.makeActive = function(index, circle) {
    console.log("CircleModule: rootScope.makeActive() ----------------------------");
    circle.index = index; // for deleting
    //Circle.currentCircle = circle;
    //Circle.currentCircle.isExpired = circle.date < new Date();
    $rootScope.circle = circle;
    $rootScope.circle.isExpired = circle.date < new Date();
    //$rootScope.$emit("circlechange"); // commented out on 11/30/12 - experimenting
  }
    
  
  $rootScope.isExpired = function() { 
    var isexpired = angular.isDefined($rootScope.circle) && $rootScope.circle.isExpired; //angular.isDefined($rootScope.circle) && $rootScope.circle.date < new Date().getTime();
    //console.log("CircleModule: rootScope.isExpired(): "+isexpired+" --------------------------------");
    return isexpired; 
  }
  
  // also referenced from events.html
  $rootScope.activeOrNot = function(circle) {
    if(!angular.isDefined($rootScope.circle))
      return false;
    return circle.id == $rootScope.circle.id ? "active" : "";
  }
  
  // I think this is being phased out.  app-EventCtrl:routeChangeSuccess makes the same call to
  // CircleParticipant.query()
  $rootScope.showParticipants = function(circle) {
    circle.participants = CircleParticipant.query({circleId:circle.id}, 
                                                  function() {
                                                    // $rootScope.giftlist(circle, circle.participants.receivers[0]);
                                                  });
  }
  
  
  $rootScope.selectEventToAddFrom = function(circle) {
    console.log("app-CircleModule: $rootScope.selectEventToAddFrom() --------------------------------");
    $rootScope.showParticipants(circle);
    $rootScope.sourceEvent = circle;
    $rootScope.addmethod='fromspecificevent';
    delete $rootScope.selectedpeople;
    $rootScope.selectedpeople = [];
    $rootScope.combineReceiversAndGiversIntoBoth(circle)
  }
  
  
  // TODO Deprecated on 1/26/13.  Not sure where all this is used but I don't think it's being used anymore
  // I used to use it in the left side menu.  Also used to use it when adding people from other events, also 
  // not used anymore.  Do a search and see where all it's used and delete if it's really not being used anywhere.
  // also referenced from events.html
  $rootScope.toggleCircle = function(circle) {
    circle.show = angular.isDefined(circle.show) ? !circle.show : true;
  }
  
  
  // probably should be in GiftModule but that doesn't exist and this function is called from this module anyway - does that matter?
  $rootScope.giftlist = function(circle, participant) {
    
    console.log("$rootScope.giftlist(): $rootScope.gifts.......commented out stuff");
  
    // We're expanding this to allow for null circle
    // How do we tell if there's no circle?
                              console.log("DO IT NOW:  giftlist/"+$rootScope.showUser.id+"/"+$rootScope.circle.id);
                              $location.url('giftlist/'+$rootScope.showUser.id+'/'+$rootScope.circle.id+'/');
  
    $rootScope.gifts = Gift.query({viewerId:$rootScope.user.id, circleId:$rootScope.circle.id, recipientId:participant.id}, 
                            function() { 
                              $rootScope.gifts.ready = true;
                              $rootScope.circle = circle;
                              $rootScope.showUser = participant;
                              if($rootScope.user.id == participant.id) { $rootScope.gifts.mylist=true; } else { $rootScope.gifts.mylist=false; } 
                            }, 
                            function() {alert("Hmmm... Had a problem getting "+participant.first+"'s list\n  Try again  (error code 401)");});
  }
  
  
  // called from event.html
  // don't have to pass circle in; it's $rootScope.circle
  $rootScope.updatecirclename = function() {
    console.log("CircleModule: updatecirclename !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    Circle.save({circleId:$rootScope.circle.id, name:$rootScope.circle.name});
  }
  
  // don't have to pass circle in; it's $rootScope.circle
  // similar to $scope.savecircle() in app-CircleCtrl
  $rootScope.updatecircledate = function(expdate) {
    $rootScope.circle.date = new Date(expdate);
    Circle.save({circleId:$rootScope.circle.id, expirationdate:$rootScope.circle.date.getTime()},
      function() {
        for(var i=0; i < $rootScope.user.circles.length; i++) {
	      if($rootScope.user.circles[i].id == $rootScope.circle.id) {
	        $rootScope.user.circles[i].date = new Date(expdate);
	      }
	    }
      } // success function of Circle.save(
    ); // Circle.save()
	    
  }
  
  // called from event.html
  $rootScope.begineditcircledate = function(expdate) {
    $rootScope.expdate=$rootScope.circle.dateStr
  }
  
  
  // TODO duplicated in ManagePeopleCtrl
  $rootScope.removereceiver = function(index, circle, participant) {
    circle.participants.receivers.splice(index, 1);
    removefromboth(circle, participant);
    if(angular.isDefined(circle.id)) {
      CircleParticipant.delete({circleId:circle.id, userId:participant.id}, function() {Reminder.delete({circleId:circle.id, userId:participant.id})});
      // now remove person from circle.reminders...
      $rootScope.removeremindersforperson(participant);
    }
  }
  
  function removefromboth(circle, participant) {
    if(angular.isDefined(circle.participants.both)) {
      for(var i=0; i < circle.participants.both.length; i++) {
        if(circle.participants.both[i].id == participant.id)
          circle.participants.both.splice(i, 1);
      }
    }
  }
  
  // TODO duplicated in ManagePeopleCtrl
  $rootScope.removegiver = function(index, circle, participant) {
    circle.participants.givers.splice(index, 1);
    removefromboth(circle, participant);
    if(angular.isDefined(circle.id)) {
      CircleParticipant.delete({circleId:circle.id, userId:participant.id}, function() {Reminder.delete({circleId:circle.id, userId:participant.id})});
      // now remove person from circle.reminders...
      $rootScope.removeremindersforperson(participant);
    }
  }
  
  // TODO duplicated in ManagePeopleCtrl
  $rootScope.removeremindersforperson = function(person) {
    $rootScope.circle.newreminders = [];
    for(var i=0; i < $rootScope.circle.reminders.length; i++) {
      if($rootScope.circle.reminders[i].viewer != person.id) {
        $rootScope.circle.newreminders.push(angular.copy($rootScope.circle.reminders[i]));
        console.log($rootScope.circle.reminders[i]);
      }
    }
    $rootScope.circle.reminders = angular.copy($rootScope.circle.newreminders);
  }
  
  
  // add all the participants in the 'fromcircle' to the 'tocircle'
  $rootScope.addparticipants = function(fromcircle, tocircle) {
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
 
 
  // TODO - finished ??????????????????
  $rootScope.savecircle = function(circle, expdate) {
    console.log("app-CircleModule: $rootScope.savecircle: expdate = "+expdate);
    circle.expirationdate = new Date(expdate);
    console.log("app-CircleModule: $rootScope.savecircle:  circle.expirationdate.getTime() = "+circle.expirationdate.getTime());
    
    // The saved circle should become the current circle if it isn't already
    $rootScope.circle = Circle.save({circleId:circle.id, name:circle.name, expirationdate:circle.expirationdate.getTime(), circleType:$rootScope.typeInfo.type, 
                 participants:circle.participants, creatorId:$rootScope.user.id},
                 function() {
                   if(!angular.isDefined(circle.id)) {
                     $rootScope.user.circles.push($rootScope.circle);
                     circle.id = $rootScope.circle.id;
                   } 
                 } 
               );
    console.log("app-CircleModule: $rootScope.savecircle:  end of $scope.savecircle()");
  }
  
    
  // We pass in circle here because this function is used for new circles where there is no circle id yet
  // as well as for existing circles.
  $rootScope.addparticipant = function(index, person, circle, participationLevel) {
    console.log("$rootScope.addparticipant = function(index, person, circle, participationLevel) ------------------------------------");
    if(!angular.isDefined(circle.participants))
      circle.participants = {receivers:[], givers:[]};
    if(participationLevel == 'Giver') {
      circle.participants.givers.push(person);
      person.isGiver = true; // YUCK!  Only doing this because circle.participants.both exists
    }
    else if(circle.receiverLimit == -1) { // no limit on receivers
      circle.participants.receivers.push(person);
      person.isReceiver = true; // YUCK!  Only doing this because circle.participants.both exists
    }
    else {
      if(circle.participants.receivers.length < circle.receiverLimit) {
        circle.participants.receivers.push(person);
        person.isReceiver = true; // YUCK!  Only doing this because circle.participants.both exists
      }
      else {
        circle.participants.givers.push(person);
        person.isGiver = true; // YUCK!  Only doing this because circle.participants.both exists
      }
    }

    
    // YUCK!  Add to 'both' also just so the new person will show up in event.html
    if(angular.isDefined(circle.participants.both)) { 
      var alreadythere = false;
      for(var i=0; i < circle.participants.both.length; i++) {
        if(circle.participants.both[i].id == person.id) alreadythere = true;
      }
      if(!alreadythere) circle.participants.both.push(person); 
    }

    
    if(index != -1) {
      console.log("index = "+index);
      $rootScope.peoplesearchresults[index].hide = true;
    }
    
    // if the circle already exists, add the participant to the db immediately
    if(angular.isDefined(circle.id)) {
      console.log("$rootScope.addparticipant:  $rootScope.user.id="+$rootScope.user.id);
      var newcp = CircleParticipant.save({circleId:circle.id, inviterId:$rootScope.user.id, userId:person.id, participationLevel:participationLevel,
                                         who:person.fullname, notifyonaddtoevent:person.notifyonaddtoevent, email:person.email, circle:circle.name, adder:$rootScope.user.fullname},
                                         function() {circle.reminders = Reminder.query({circleId:circle.id})});
    }
  }
  
  $rootScope.beginAddingByName = function(participationLevel) {
    $rootScope.participationLevel = participationLevel;
    $rootScope.addmethod = 'byname';
  }
  
  $rootScope.beginAddingFromAnotherEvent = function(participationLevel) {
    $rootScope.circlecopies = angular.copy($rootScope.user.circles);
    $rootScope.addmethod='fromanotherevent';
    $rootScope.participationLevel = participationLevel;
    console.log("app-CircleModule: rootScope.beginAddingFromAnotherEvent --------------------------------------");
  }
  
  // THIS IS KINDA DUMB...
  // the only reason that I'm combining the givers and receivers here is so that I can 
  // tell where the last row is on event.html  Otherwise, all I know is that I have a collection
  // of givers and another collection of receivers and I can only tell where the last row 
  // of each group is.
  $rootScope.combineReceiversAndGiversIntoBoth = function(circle) {
    circle.participants = CircleParticipant.query({circleId:circle.id}, 
            function() {
                console.log("$rootScope.combineReceiversAndGiversIntoBoth:  circle.participants.....");
                console.log(circle.participants);
                
                // THIS IS KINDA DUMB...
		        // the only reason that I'm combining the givers and receivers here is so that I can 
		        // tell where the last row is on event.html  Otherwise, all I know is that I have a collection
		        // of givers and another collection of receivers and I can only tell where the last row 
		        // of each group is.
		        circle.participants.both = [];
		        for(var i=0; i < circle.participants.receivers.length; i++) {
		          var p = circle.participants.receivers[i];
		          p.isReceiver = true;
		          circle.participants.both.push(p);
		        }
		        for(var i=0; i < circle.participants.givers.length; i++) {
		          var p = circle.participants.givers[i];
		          p.isGiver = true;
		          circle.participants.both.push(p);
		        }
                console.log("$rootScope.combineReceiversAndGiversIntoBoth:  circle.participants.both.....");
                console.log(circle.participants.both);
	                
            } // success function of CircleParticipant.query
    ); // CircleParticipant.query
  }
  
  $rootScope.determineCurrentCircle = function(newRoute) {
    console.log("$rootScope.determineCurrentCircle -----------------------------------------------");
    
    if(angular.isDefined(newRoute.params.circleId)) {
        for(var i=0; i < $rootScope.user.circles.length; i++) {
          if($rootScope.user.circles[i].id == newRoute.params.circleId) {
            $rootScope.circle = $rootScope.user.circles[i];
            
            $rootScope.combineReceiversAndGiversIntoBoth($rootScope.circle)
            
          } // if($rootScope.user.circles[i].id == newRoute.params.circleId)
        } // for(var i=0; i < $rootScope.user.circles.length; i++)
    } // if(angular.isDefined(newRoute.params.circleId))
  }
    
});