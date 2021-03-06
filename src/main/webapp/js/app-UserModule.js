
angular.module('UserModule', ['ngResource', 'ngCookies', 'ui', 'angularBootstrap.modal', 'ui.bootstrap.dropdownToggle']).
  factory('UserSearch', function($resource) {
      var UserSearch = $resource('/gf/rest/usersearch', {search:'@search'}, 
                    {
                      query: {method:'GET', isArray:true}
                    });

      return UserSearch;
  }).
  factory('User', function($resource) {
      var User = $resource('/gf/rest/users/:userId', {userId:'@userId', fullname:'@fullname', first:'@first', last:'@last', gender:'@gender', email:'@email', username:'@username', 
                                                 password:'@password', dateOfBirth:'@dateOfBirth', bio:'@bio', profilepic:'@profilepic', login:'@login', 
                                                 creatorId:'@creatorId', creatorName:'@creatorName', facebookId:'@facebookId', friends:'@friends', lbbfriends:'@lbbfriends',
                                                 notifyonaddtoevent:'@notifyonaddtoevent', notifyondeletegift:'@notifyondeletegift', 
                                                 notifyoneditgift:'@notifyoneditgift', notifyonreturngift:'@notifyonreturngift'}, 
                    {
                      query: {method:'GET', isArray:true}, 
                      find: {method:'GET', isArray:false}, 
                      save: {method:'POST'}
                    });
                    
      
      // cut-n-paste from User.js in the mobile side
      User.alreadyfriends = function(usera, userb) {
        for(var i=0; i < usera.friends.length; ++i) {
          if(usera.friends[i].id == userb.id) {
            return true;
          }
        }
        return false;
      }
      

      // not meant to save to the db, just to the user's list of friends
      User.addfriend = function(usera, userb) {
        if(usera.id == userb.id) return; // you can't be friend of yourself
        if(!User.alreadyfriends(usera, userb))
          usera.friends.push(userb);
      }
      

      return User;
  }).
  factory('Server', function($resource) { // poll to make sure the server is still there, or else alert the user that the server is offline
      var Server = $resource('/gf/rest/server', {}, 
                    {
                      ping: {method:'GET', isArray:false}
                    });
                    
      return Server;
  }).
  factory('Password', function($resource) {
      var Password = $resource('/gf/rest/password/:userId/:currentpassword/:newpassword', {userId:'@userId',  
                                                 currentpassword:'@currentpassword', newpassword:'@newpassword'}, 
                    {
                      check: {method:'GET', isArray:false},
                      save: {method:'POST', isArray:true}
                    });
                    
      return Password;
  }).
  factory('Friend', function($resource) {
      var Friend = $resource('/gf/rest/friend/:userId/:friendId', {userId:'@userId', friendId:'@friendId'},
                    {
                      delete: {method:'DELETE'}
                    });
      return Friend;
  }).
  factory('AppRequest', function($resource){
      var AppRequest = $resource('/gf/rest/apprequest', {requests:'@requests', circlestuff:'@circlestuff'}, 
                       {
                         save: {method:'POST', isArray:false}
                       });
      return AppRequest;
  }).
  factory('FacebookServerSide', function($resource){
      var FacebookServerSide = $resource('/gf/rest/FacebookServerSide/:accessToken/:facebookId/:userId/:queryType', {accessToken:'@accessToken', facebookId:'@facebookId', userId:'@userId', queryType:'@queryType'}, 
                       {
                         friends: {method:'GET', isArray:true}
                       });
      return FacebookServerSide;
  }).
  factory('MergeUsers', function($resource){
      var MergeUsers = $resource('/gf/rest/mergeusers/:userId/:facebookId/:email', {userId:'@userId', facebookId:'@facebookId', email:'@email'}, 
                       {
                         save: {method:'POST', isArray:false}
                       });
      return MergeUsers;
  }).
  factory('Logout', function($resource) {
      var Logout = $resource('/gf/rest/logout', {}, {logout: {method:'POST'}});
      return Logout;
  }).
  factory('Reminder', function($resource) {
      var Reminder = $resource('/gf/rest/reminders/:circleId', {circleId:'@circleId', userId:'@userId', remind_date:'@remind_date', people:'@people'},
                     {
                       query: {method:'GET', isArray:true},
                       delete: {method:'DELETE'},
                       save: {method:'POST', isArray:true}
                     });
                     
      return Reminder;
  }).
  factory('Email', function($resource) {
      var Email = $resource('/gf/rest/email', {to:'@to', email:'@email', from:'@from', subject:'@subject', message:'@message', type:'@type', user:'@user'}, 
                    {
                      send: {method:'POST'}
                    });
                    
      // 2013/11/25 Added email:'@email'  See diary for this day

      return Email;
  })
  .factory('dimAdjuster', function() {
    var obj = {};
    
    obj.adjustedwidth = function(auser, limit) {
      if(!angular.isDefined(auser))
        return -1;
      var image = new Image();
      image.src = auser.profilepicUrl;
      var mindim = image.height < image.width ? image.height : image.width;
      if(auser.fullname == 'Eric Moore') {console.log(auser); console.log("mindim: "+mindim);}
      var ratio = mindim > limit ? limit / mindim : 1;
      if(auser.fullname == 'Eric Moore') console.log("ratio: "+ratio);
      var adj = ratio * image.width;
      if(auser.fullname == 'Eric Moore') console.log("adj: "+adj);
      return adj;
    };
    
    obj.adjustedheight = function(auser, limit) {
      if(!angular.isDefined(auser))
        return -1;
      var image = new Image();
      image.src = auser.profilepicUrl;
      var mindim = image.height < image.width ? image.height : image.width;
      var ratio = mindim > limit ? limit / mindim : 1;
      var adj = ratio * image.height;
      return adj;
    }; // obj.adjustHeight
    
    return obj;
  })
	.run(function($location, $cookieStore, $rootScope, User) {
	  
	    // See events.html:  #/newevent/Christmas,Birthday,etc
	    // This event is fired all the time, so make sure the url contains 'newevent' to proceed
	    $rootScope.$on('$routeChangeStart', function(scope, newRoute){ 
	        if($location.url().indexOf('accountinfo') != -1) {
	            if(angular.isDefined($rootScope.user)) $rootScope.usercopy = angular.copy($rootScope.user);
	            else if($cookieStore.get("user") != null) {
	                $rootScope.user = User.find({userId:$cookieStore.get("user")}, function(){$rootScope.usercopy = angular.copy($rootScope.user);});
	            }
	        }
	    })   
	})
  .directive('btnEditCircle', function(){
      return {
        scope: false,
        // The linking function will add behavior to the template
        link: function(scope, element, attrs) {
           $('.dropdown-toggle').dropdown();
        }
      }
  })
  .directive('friendStuff', function(){
      return {
        replace: false,
        // The linking function will add behavior to the template
        link: function(scope, element, attrs) {
           $('.dropdown-toggle').dropdown();
        }
      }
  })
  .directive('btnAddCircle', function(){
      return {
        restrict: 'E',
        replace: true,
        transclude: false,
           controller: CircleCtrl,
        scope: false,
     templateUrl: 'templates/ddbtn-addcircle.html',
        // The linking function will add behavior to the template
        link: function(scope, element, attrs) {
           $('.dropdown-toggle').dropdown();
        }
      }
  })
  .directive('giftActions', function(){
      return {
        // The linking function will add behavior to the template
        link: function(scope, element, attrs) {
           $('.dropdown-toggle').dropdown();
        }
      }
  })
  .directive('searchUsers', function(){
      return {
        scope:false,
        // The linking function will add behavior to the template
        link: function(scope, element, attrs, controller) {
           element.bind("keyup", 
             function() {
               // see app.js: $rootScope.query()
               scope.query(scope.search);
             }
           );
        }
      }
  })
  .run(function($rootScope, $location, $cookieStore, User, Logout) {
  
    // 5/8/13 - moved this from app-EventCtrl to here trying to make it accessible from app-EventCtrl and app-FriendCtrl
    $rootScope.resetInviteByEmailForm = function(form){
      delete $rootScope.addmethod;
      delete $rootScope.noonefound;
      form.$setPristine();
      $rootScope.newuser = {fullname: '', email: ''};
      //angular.resetForm($scope, 'emailnewuserform', {newuser:{fullname: '', email: ''}}); 
    };
    
    // 2/15/13 - get rid of this and start using emailnewuser instead
    $rootScope.beginnewuser = function() {
      $rootScope.addmethod = 'createaccount';
      $rootScope.newuser = {};
      console.log("app-UserModule:  beginnewuser:  $rootScope.addmethod="+$rootScope.addmethod);
    } 
    
    // 2/15/13
    $rootScope.emailnewuser = function() {
      $rootScope.addmethod = 'emailnewuser';
      $rootScope.newuser = {};
      console.log("app-UserModule:  emailnewuser:  $rootScope.addmethod="+$rootScope.addmethod);
    } 
    
    $rootScope.isUsernameUnique = function(user, form) {
      console.log("$rootScope.isUsernameUnique() -----------------------------------");
      if(!angular.isDefined(user.username)) {
        console.log("$rootScope.isUsernameUnique:  user.username is not defined");
        return;
      }
      checkUsers = User.query({username:user.username}, 
                                        function() {
                                          if(checkUsers.length > 0) { form.username.$error.taken = 'true'; }
                                          else { form.username.$error.taken = 'false'; }
                                        });
    } 
  
    // 2/15/13
    $rootScope.userfieldsvalid = function(user) {
      var ret = angular.isDefined(user) && angular.isDefined(user.fullname) && angular.isDefined(user.email)
          && angular.isDefined(user.username) && angular.isDefined(user.password) 
          && angular.isDefined(user.passwordAgain) && user.fullname != '' && user.email != '' && user.username != ''
          && user.password != '' && user.passwordAgain != '' && user.password == user.passwordAgain;
      return ret;
    }
    
    
    // 2/18/13
    $rootScope.validateEmailInvitation = function(user) {
      var ret = angular.isDefined(user) && angular.isDefined(user.fullname) && angular.isDefined(user.email)
          && user.fullname != '' && user.email != '';
      return ret;
    }
    
  
    // 2/12/13, 5/8/13: add the new user to the current user's list of friends
    $rootScope.createonthefly = function(newuser, thecircle) {
      anewuser = User.save({fullname:newuser.fullname, first:newuser.first, last:newuser.last, username:newuser.username, email:newuser.email, password:newuser.password, bio:newuser.bio, dateOfBirth:newuser.dateOfBirth, creatorId:$rootScope.user.id, creatorName:$rootScope.user.fullname}, 
                                  function() {
                                    if(thecircle) {
                                      $rootScope.addparticipant(-1, anewuser, thecircle, $rootScope.participationLevel); 
                                    }
                                    $rootScope.user.friends.push(anewuser);
                                    $rootScope.addmethod = 'byname'; 
                                    $rootScope.usersearch = ''; 
                                    $rootScope.search = '';
                                  } // end success function
                                );
    }
    
    
    // 2013-09-13 modeled after $rootScope.createonthefly() above
    $rootScope.createFriendOnTheFly = function(newuser) {
      console.log('CREATE FRIEND ON THE FLY ---------------------------------------');
      anewuser = User.save({fullname:newuser.fullname, first:newuser.first, last:newuser.last, username:newuser.username, email:newuser.email, password:newuser.password, bio:newuser.bio, dateOfBirth:newuser.dateOfBirth, creatorId:$rootScope.user.id, creatorName:$rootScope.user.fullname}, 
                                  function() {
                                    $rootScope.user.friends.push(anewuser);
                                    $rootScope.addmethod = 'byname'; 
                                    $rootScope.usersearch = ''; 
                                    $rootScope.search = '';
                                  } // end success function
                                );
    }
    
    // 3/12/13
    $rootScope.logout = function() {
      Logout.logout({}, function() {delete $rootScope.user;});   
      $cookieStore.remove("user");
      console.log("app-UserModule: $rootScope.logout() 44444444444444 -----------------------------");                                      
    }

  });
