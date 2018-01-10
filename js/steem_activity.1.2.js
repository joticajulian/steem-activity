var language = navigator.language || navigator.userLanguage;
load_language();

var now = new Date();
var gmt = now.getTimezoneOffset()*60*1000; //gmt in milliseconds
var last1week = new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
var last2week = new Date(now.getTime() - 2*7*24*60*60*1000);
var last3week = new Date(now.getTime() - 3*7*24*60*60*1000);
var last4week = new Date(now.getTime() - 4*7*24*60*60*1000);

document.getElementById("timezone1").innerHTML = lang("Local time: ") + gmtToString();
document.getElementById("timezone2").innerHTML = lang("Local time: ") + gmtToString();

//Array of Votes and initialization
var votesDay = [0,0,0,0,0,0,0];
var a_votesDay = [0,0,0,0,0,0,0];

var votes = new Array(7);
for(i=0;i<7;i++){
	votes[i] = new Array(24);
	for(j=0;j<24;j++){        
		votes[i][j]=0;
	}
}

var a_votes = new Array(7);
for(i=0;i<7;i++){
	a_votes[i] = new Array(24);
	for(j=0;j<24;j++){        
		a_votes[i][j]=0;
	}
}

var followersLoaded = 0;
var totalFollowers = 0;
var textFollowers = "";
nameDay = lang("nameDay");
nameHours = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];


var maxVotation = [0,0,0,0];
var maxVotationDay = 0;
var bestHour = [[0,0],[0,0],[0,0],[0,0]];
var bestDay = 0;
var refreshPlot = 10;
var refreshText = 5;
var firstPlot = true;
var firstText = true;

function loadFollowersActivity(){
	/*steem.api.getConfig(function(err, response){
		console.log(err, response);
	});*/
    steem.api.setOptions({ url: 'https://api.steemit.com'});

	var account = getQuery();
	
	steem.api.getAccounts([account], function(err, result){
		console.log(err, result);
		var info = JSON.parse(result[0].json_metadata);
		if(info.profile.hasOwnProperty('profile_image')){
			console.log(info.profile.profile_image + " extracted: " + extractUrlProfileImage(info.profile.profile_image));
			document.getElementById("profile_image").src = extractUrlProfileImage(info.profile.profile_image);
		}else{
			console.log("no photo");			
		}
	});
	
	document.getElementById("labelAccount").innerHTML = "@" + account;
	document.getElementById("title-followers").innerHTML = lang("Followers of @") + account;
	//document.getElementById("title-activity-account").innerHTML = "Activity of @" + account;
	
	consultVotesAccount(account);
	
	steem.api.getFollowCount(account, function(err,result) {
		console.log("Number of followers: "+result.follower_count);
		totalFollowers = result.follower_count;
		document.getElementById("title-followers").innerHTML = lang("Followers of @") + account + ": "+totalFollowers;
		consultVotesFollowers(account,0);		
	});
}

function consultVotesAccount(account){
	steem.api.getAccountVotes(account, function(err, result) {
		//console.log(err,result);
		//if (err) //error
		//look each vote and put it in the array regarding the time
		for(i=result.length-1;i>=0;i--){
			var timeUTC = new Date(result[i].time);
			var time = new Date(timeUTC.getTime() - gmt);
			if(timeToBreak(time,result.length-i)) break;					
			var hours = time.getHours();
			var day = time.getDay();
			a_votes[day][hours]++;	
			a_votesDay[day]++;			
		}

		for(i=0;i<7;i++){
			var data = [{
				x: nameHours,
				y: a_votes[i],	      
				type: 'bar'
			}];					
			var layout = { title: nameDay[i] };
			Plotly.newPlot('a-chart'+i, data,layout);
			document.getElementById("a-votesDay"+i).innerHTML = nameDay[i]+": "+a_votesDay[i]+lang(" votes");
		}			
	});
}

function consultVotesFollowers(account, fromFollower){	
	steem.api.getFollowers(account, fromFollower, 0, 21, function(err, result) {
				
		//look each for each Follower
		var finish = result.length-1;
		if(result.length == 1) finish=1; //last follower
		
		for(i=0;i<finish;i++){
			if(result[i].what[0] != 'blog') continue;
			textFollowers = textFollowers + link(result[i].follower) + " . . . . ";		
									
			steem.api.getAccountVotes(result[i].follower, function(err, result) {
				//if (err) //error
				//look each vote and put it in the array regarding the time
				for(i=result.length-1;i>=0;i--){
					var timeUTC = new Date(result[i].time);
					var time = new Date(timeUTC.getTime() - gmt);
					if(timeToBreak(time,result.length-i)) break;					
					var hours = time.getHours();
					var day = time.getDay();
					votes[day][hours]++;
					votesDay[day]++;
					for(j=0;j<4;j++){
						if(votes[day][hours] > maxVotation[j]){
							maxVotation[j] = votes[day][hours];
							bestHour[j] = [day,hours];
							break;
						}
					}
					if(votesDay[day] > maxVotationDay){
						maxVotationDay = votesDay[day];
						bestDay = day;
					}
				}

				followersLoaded++;				

				refreshText--;
				if(firstText || refreshText==0 || followersLoaded==totalFollowers){
					var percentage = 100*followersLoaded/totalFollowers;
					var tPer = percentage.toFixed(2);
					var tBar = followersLoaded + "/" + totalFollowers;
					if(followersLoaded == totalFollowers) tBar = tBar + lang(". Complete");
					document.getElementById("progress-bar").innerHTML = tBar;
					document.getElementById("progress-bar").ariaValuenow = tPer;
					document.getElementById("progress-bar").style = "width: "+tPer+"%;";
					document.getElementById("followers").innerHTML = textFollowers;
					for(i=0;i<4;i++){
						document.getElementById("bestTime"+i).innerHTML = lang("Best Time #")+(i+1)+": " + nameDay[bestHour[i][0]] + lang(" at ") + bestHour[i][1] + " H";
					}
					firstText = false;
					refreshText = 5;
				}
				
				refreshPlot--;
				if(firstPlot || refreshPlot==0 || followersLoaded==totalFollowers){
					for(i=0;i<7;i++){
						var data = [{
							x: nameHours,
							y: votes[i],	      
							type: 'bar'
						}];					
						var layout = { title: nameDay[i] };
						Plotly.newPlot('f-chart'+i, data,layout);
						document.getElementById("f-votesDay"+i).innerHTML = nameDay[i]+": "+votesDay[i]+lang(" votes");
					}
					firstPlot = false;
					refreshPlot = 10;
				}
			});			
		}
		
		if(result.length>1){
			var lastFollower = result[result.length-1].follower;
			console.log("Consult from "+lastFollower);
			consultVotesFollowers(account, lastFollower);
		}else{
			console.log("Finished");
		}
	});
}

function timeToBreak(time,n){
	if(time < last4week) return true;
	return false;
}

function link(account){
	var url = "https://joticajulian.github.io/steem-activity/index.html";
	return "<a href=" + url + "?lang="+language +"&account="+account + ">" + account + "</a>";
}

function getQuery(){
	var kvp = document.location.search.substr(1).split('&');	
	var account = '';	
	var text = '';	
	if(kvp != ''){	
		var i = kvp.length; 	
		var x; 	
		while (i--) {	
			x = kvp[i].split('=');			
			if (x[0] == 'account'){	
				account = x[1];				
			}else if (x[0] == 'lang'){
				language = x[1];
				load_language();				
			}
		}	
	}
	return account;
}

function searchAccount(){
	var url = "https://joticajulian.github.io/steem-activity/index.html?lang="+language+"&account=" + document.getElementById("input-account").value;
	console.log("opening: "+url);
	window.open(url, "_self");  
}

function extractUrlProfileImage(url){
	if(url.substring(0,8) == "![image]"){
		return url.substring(9, url.length - 1);
	}
	return url;
}

function load_language() {
  $(".is_ml").each(function() {
    $(this).html(lang($(this).attr("id")))
  })
  
  $(".is_ml_p").each(function() {
    $(this).attr('placeholder', lang($(this).attr("id")))
  })
  
  document.getElementById("timezone1").innerHTML = lang("Local time: ") + gmtToString();
  document.getElementById("timezone2").innerHTML = lang("Local time: ") + gmtToString();
  nameDay = lang("nameDay");
};

function lang(id){
	if(typeof label[language] === "undefined" ){
		return label["en"][id];
	}else if(typeof label[language][id] === "undefined"){
		return label["en"][id];
	}
	return label[language][id];
}

function gmtToString(){
	var text;
    var now = new Date();
    var gmt = now.getTimezoneOffset();
    
    if(gmt<=0) text = "GMT+";
	else text = "GMT-";	
	
    var hour = Math.floor(Math.abs(gmt/60));
	var minute = Math.abs(gmt)%60;
	text += pad(hour,2) + ":" + pad(minute,2);
    return text;
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

document.getElementById('input-account').onkeydown = function(e){   
   if(e.keyCode == 13){	 
	 e.preventDefault();
     searchAccount();
   }
};