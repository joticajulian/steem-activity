var language = navigator.language || navigator.userLanguage;
load_language();

var now = new Date();
var g = 0;
var tBar;
var tPer;
var gmt = now.getTimezoneOffset()*60*1000; //gmt in milliseconds
var last1week = new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
var last2week = new Date(now.getTime() - 2*7*24*60*60*1000);
var last3week = new Date(now.getTime() - 3*7*24*60*60*1000);
var last4week = new Date(now.getTime() - 4*7*24*60*60*1000);

$('.timezone').text(lang("Local time: ") + gmtToString());

var followersLoadedSubgroup = 0;
var followersLoaded = 0;
var totalFollowers = 0;
var textFollowers = "";
var sizeF = 0;
var numberRequests = 20;
var followers = new Array(1000);
var account;
var timeConsult;
var numErrorsFollower = 0;

var nameDay = lang("nameDay");
var nameHours = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
var marginPlot = {l:40,r:25,b:30,t:60,pad:5};


var maxVotation = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
var maxVotationDay = 0;
var bestHour = [[0,0],[0,0],[0,0],[0,0]];
var bestDay = 0;
var refreshPlot = 10;
var refreshText = 1;
var firstPlot = true;
var firstText = true;

var votesDay = [0,0,0,0,0,0,0];
var votes = new Array(7);


function loadFollowersActivity(){
	steem.api.setOptions({ url: 'https://api.steemit.com'});

	account = getQuery();
    
    console.log("getting rewardFund(post)...");
    steem.api.getRewardFund("post", function(err, response){
        console.log(err);
        var recent_claims = parseFloat(response.recent_claims);
        var reward_balance = parseFloat(response.reward_balance.replace(" STEEM",""));
          
        console.log("getting internal price...");
        steem.api.getCurrentMedianHistoryPrice(function(err, response){
            console.log(err);
            var price = parseFloat(response.base.replace(" SBD",""))/parseFloat(response.quote.replace(" STEEM",""));
            g = reward_balance/recent_claims*price;
            
            loadAccountProfile();
            consultVotesAccount();
            startConsultVotesFollowers();
	
            $('#sel1').change(function(){
                consultVotesAccount();
            });
            
            $('#sel2').change(function(){
                startConsultVotesFollowers();
            });
        });
    });
}

function loadAccountProfile(){
    steem.api.getAccounts([account], function(err, result){
        if(err){
            console.log(err);
            return;
        }
        var info = JSON.parse(result[0].json_metadata);
        if(info.profile.hasOwnProperty('profile_image')){
            console.log(info.profile.profile_image + " extracted: " + extractUrlProfileImage(info.profile.profile_image));
            $('#profile_image').attr('src', extractUrlProfileImage(info.profile.profile_image));
        }else{
            console.log("no photo");			
        }
    });
    $('#labelAccount').text("@" + account);
    $('#title-followers').text(lang("Followers of @") + account);    
}


function consultVotesAccount(){

    var a_votesDay = [0,0,0,0,0,0,0];
    var a_votes = new Array(7);
    for(i=0;i<7;i++){
        a_votes[i] = new Array(24);
        for(j=0;j<24;j++){        
            a_votes[i][j]=0;
        }
    }

    
    steem.api.getAccountVotes(account, function(err, result) {
        if(err){
            console.log(err);
            return;
        }
        //look each vote and put it in the array regarding the time
        for(i=result.length-1;i>=0;i--){
            var timeUTC = new Date(result[i].time);
            var time = new Date(timeUTC.getTime() - gmt);
            if(timeToBreak("1",time,result.length-i)) break;					
            var hours = time.getHours();
            var day = time.getDay();
            var vote = Number((parseInt(result[i].rshares)*g).toFixed(3));
            a_votes[day][hours] += vote;
            a_votesDay[day] += vote;	
        }

        for(i=0;i<7;i++){
            var data = [{
                x: nameHours,
                y: a_votes[i],	      
                type: 'bar'
            }];
            var layout = { 
                    title: (nameDay[i]+": $"+a_votesDay[i].toFixed(2)),
                    margin: marginPlot
                };
            Plotly.newPlot('a-chart'+i, data,layout);            
        }			
    });    
}

function startConsultVotesFollowers(){

    votesDay = [0,0,0,0,0,0,0];
    votes = new Array(7);
    for(i=0;i<7;i++){
        votes[i] = new Array(24);
        for(j=0;j<24;j++){        
            votes[i][j]=0;
        }
    }
    
    followersLoaded = 0;
    totalFollowers = 0;
    textFollowers = "";
    
    timeConsult = new Date();
    
    steem.api.getFollowCount(account, function(err,result) {        
        if(err){
            console.log(err);
            return;
        }
        console.log("Number of followers: "+result.follower_count);
        totalFollowers = result.follower_count;
        $('#title-followers').text(lang("Followers of @") + account + ": "+totalFollowers);
        consultVotesFollowers(0,this.tC);
    }.bind({tC:timeConsult}),timeConsult);    
}

function consultVotesFollowers(fromFollower,tC){
    steem.api.getFollowers(account, fromFollower, 'blog', followers.length, function(err, result) {
        if(err){
            console.log(err);
            return;
        }
        sizeF = result.length;
        for(i=0;i<sizeF;i++){
            followers[i] = result[i].follower;
            textFollowers = textFollowers + link(followers[i]) + " . . . . ";
        }
        $('#followers').html(textFollowers);
         
        followersLoadedSubgroup = 0;
        for(i=0;i<numberRequests;i++){
            if(i<sizeF-1){ //sizeF-1: no not get the last one (this for the other round)
                getVotesFollower(i,this.tC);                
            }    
        }
        
    }.bind({tC:tC}),tC);
}

function getVotesFollower(k,tC){
    steem.api.getAccountVotes(followers[k], function(err, result) {
        if(timeConsult != this.tC){
            console.log("Aborting last call");
            return;
        }

        if(numErrorsFollower >= 30) $('#progress-bar').text("Error. Please try again").attr('aria-valuenow', 100).css('width',100+'%');
        
        
        if(err){
            console.log("Error follower: "+ followers[k]);
            numErrorsFollower++;
            if(numErrorsFollower < 30) getVotesFollower(k,this.tC);
            else{
                $('#progress-bar').text("Error. Please try again").attr('aria-valuenow', 100).css('width',100+'%');
            }
            return;
        }
                        
        //look each vote and put it in the array regarding the time
        for(i=result.length-1;i>=0;i--){
            var timeUTC = new Date(result[i].time);
            var time = new Date(timeUTC.getTime() - gmt);
            if(timeToBreak("2",time,result.length-i)) break;					
            var hours = time.getHours();
            var day = time.getDay();                    
            var vote = Number((parseInt(result[i].rshares)*g).toFixed(3));
            votes[day][hours] += vote;
            votesDay[day] += vote;
                    
            var v = [day,hours,votes[day][hours]];
            for(j=0;j<4;j++) if(maxVotation[j][0]==day && maxVotation[j][1]==hours) maxVotation[j]=[0,0,0];
            maxVotation.push(v);
            maxVotation.sort(function(a, b){return b[2]-a[2]});
            maxVotation.pop();
        }

        followersLoaded++;	
        followersLoadedSubgroup++; 

        //Refresh progress bar
        refreshText--;
        if(firstText || refreshText==0 || followersLoaded==totalFollowers){
            var percentage = 100*followersLoaded/totalFollowers;
            tPer = percentage.toFixed(2);
            tBar = followersLoaded + "/" + totalFollowers;
            $('#progress-bar').text(tBar).attr('aria-valuenow', tPer).css('width',tPer+'%');
            
            for(i=0;i<4;i++){
                //$('#bestTime'+i).text(lang("Best Time #")+(i+1)+": " + nameDay[bestHour[i][0]] + lang(" at ") + bestHour[i][1] + " H");
                $('#bestTime'+i).text(lang("Best Time #")+(i+1)+": " + nameDay[maxVotation[i][0]] + lang(" at ") + maxVotation[i][1] + " H");
            }
            firstText = false;
            refreshText = 1;
        }
				
        //Refresh plots
        refreshPlot--;
        if(firstPlot || refreshPlot==0 || followersLoaded==totalFollowers){
            for(i=0;i<7;i++){
                var data = [{
                    x: nameHours,
                    y: votes[i],
                    type: 'bar',                    
                }];					
                var layout = { 
                    title: (nameDay[i]+": $"+votesDay[i].toFixed(2)),
                    margin: marginPlot
                };
                Plotly.newPlot('f-chart'+i, data,layout);
                //$('#f-votesDay'+i).text(nameDay[i]+": $"+votesDay[i].toFixed(2));
            }
            firstPlot = false;
            refreshPlot = 10;
        }
        
        if(timeConsult == this.tC){
            var next = k+numberRequests;
            if(next<sizeF) getVotesFollower(next,this.tC);
            if(followersLoadedSubgroup == sizeF) consultVotesFollowers(followers[sizeF-1],this.tC);
        }else{
            console.log("Aborting call");            
        }        
    }.bind({tC:tC}),tC);    
}
		
        

function timeToBreak(block,time,n){
    var selTime = $('#sel'+block).find(":selected").text();
    if(selTime == lang("last1week"+block)){
        if(time < last1week) return true;
    }else if(selTime == lang("last2week"+block)){
        if(time < last2week) return true;
    }else if(selTime == lang("last3week"+block)){
        if(time < last3week) return true;
    }else{
        if(time < last4week) return true;
    }
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
  
  $('.timezone').text(lang("Local time: ") + gmtToString());
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