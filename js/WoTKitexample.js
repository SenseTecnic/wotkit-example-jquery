

/*Sensor Object to encapsulate calls related to a particular sensor*/
function Sensor(sensorName) {

    var WOTKIT_URL = "http://wotkit.sensetecnic.com/api/v1";

    /**
    * Makes a GET call to the data endpoint of the WoTKit API
    * @param	callback	Required: A function that will be executed when the API call has completed and Data has been received.
    * @param 	beforeE 	Optional: The number of elements before the start time. E.g. to get the last 10 use beforeE=10
    * @return 			The callback function will be executed.
    **/
    this.getData = function(callBack, beforeE) {
       if (typeof beforeE === "undefined") { 
           beforeE = "10";
       } 
       $.ajax({
              type:"GET",
              url:WOTKIT_URL+'/sensors/'+encodeURIComponent(sensorName)+'/data?beforeE='+ beforeE,
              success: function(data){ 
                  dataArray = data; //do some processing if needed here 
                  callBack(dataArray);
              }
        });
    }

    /**
    * Makes a GET call to the fields endpoint of the WoTKit API
    * @param 	callback	Required: A function that will be executed when the API call has completed and Data has been received.
    * @return			The callback function will be executed.
    **/
    this.getFields = function(callBack) {
       $.ajax({
              type:"GET",
              url:WOTKIT_URL+'/sensors/'+encodeURIComponent(sensorName)+'/fields',
              success: function(data){ 
                  fieldsArray = data; //do some processing with array if needed here
                  callBack(fieldsArray);
              }
        });
    }
}

/**
* An simple AJAX call to the WoTKit API. It will take a search HTML form object and make a call to the sensors endpoint of the WoTKit API
* @param	searchText	A string to search, often from a text box.
* @param	callBack	A function that will be called with the data (a sensor list) when API call has completed.
* @return 	
**/
function searchSensors (searchText, callBack) {
    var WOTKIT_URL = "http://wotkit.sensetecnic.com/api/v1";
    $.ajax({
            type:"GET",
            url:WOTKIT_URL+'/sensors?text='+encodeURIComponent(searchText),
            success: function(data){callBack(data)}
    });
}

/**
* Update an HTML list with sensors and bind click events to the 'updateCharts' function
* @param	sensorList	An array of sensors as returned by the WoTKit API: [{"id":1, "name":"sensor", "fields": [...], ... }, ... ]
**/
function updateSensorList(sensorList) {
    $('#sensor-list').empty();
    for (var i=0; i<sensorList.length; i++){
        var listItem = "<li class='sensor-list-item' id='"+sensorList[i].id+"'><a href='#'>"+sensorList[i].longName+"</a></li>";
        $('#sensor-list').append(listItem);
        $('#'+sensorList[i].id).click(
                function(){
                    $('.sensor-list-item').removeClass('active');
                    $(this).addClass('active');
                    updateCharts($(this).attr('id'));
                }
        );
    }
}

/**
* When a sensor is selected update all charts in the dashboard.
* @param	sensorName	The name or id of a sensor.
**/

function updateCharts(sensorName){
    var sensor = new Sensor(sensorName);        

    /* You can use a sensor's fields to create charts. For example using Latitude and Longitude*/    
    sensor.getFields( function (fieldsArray) {

        /*Google Charts Map*/
        var fieldsArrayHash = {};
        //Let's create a hash-type object to easily search for fields.
        for (var i=0; i<fieldsArray.length; i++ ) {  
            fieldsArrayHash[fieldsArray[i].name] = fieldsArray[i].value;
        }
        drawMap(fieldsArrayHash["lat"], fieldsArrayHash["lng"], 'Sensor');

    });


    /*You can use sensor data to draw different types of charts*/
    sensor.getData(function (dataArray) { //callback function when data received from API 

        /*ChartJS Line Chart*/
        drawLineChart(dataArray);

        /*ChartJS Polar Chart*/
        drawPolarChart(); //Reinitialize in this chart.
        var occurrences = countDataOccurrences(dataArray); //Count the times each data point appears in the set
        for (var i=0; i < occurrences[0].length; i++){
            window.myPolarArea.addData({
                value: Math.abs(occurrences[1][i]),
                color: getRandomColor(),
                highlight: "#999",
                label: "Occurrences of Value " + occurrences[0][i].toString()
            });
        }
        window.myPolarArea.update();

        /*Google Charts Trendline Chart*/
        drawTrendlineChart(dataArray);        

        /*HTML Table */
        drawTable(dataArray)           
                                        
    }, 10); //Number of previous data points to get
}

/* ChartJS Charts */
 
/**
* Draw a ChartJS line chart using sensor data
* @param	dataArray	A data array as returned by the WoTKit API: [{"id":1, "value":1, ... }, ... ]
**/
function drawPolarChart (){
    var ctx = document.getElementById("chart-polar").getContext("2d");
    if (window.myPolarArea) window.myPolarArea.destroy();
    window.myPolarArea = new Chart(ctx).PolarArea( [], {responsive:true});
    $("#chart-polar").click( 
                 function(evt){ //An example of binding click events to parts of a chart in ChartJS.
                        var activePoints = myPolarArea.getSegmentsAtEvent(evt);
                        var alertText = "label=" + activePoints[0].label + ", value=" + activePoints[0].value;
                        console.log(alertText);
                 }
     );     
};
 

/**
* Draw a ChartJS line chart using sensor data
* @param	dataArray	A data array as returned by the WoTKit API: [{"id":1, "value":1, ... }, ... ]
**/
function drawLineChart (dataArray) {

    /* Build the data array according to specification
    *  http://www.chartjs.org/docs/#line-chart
    */
    var lineDataArray = [];
    for (var i=0; i < dataArray.length; i++){
        lineDataArray.push(Math.abs(dataArray[i].value));
    }

    var lineChartData = {
        labels : ["","","","","","","","","",""],
        datasets : [
            {
                label: "Data Points",
                fillColor : "rgba(220,220,220,0.2)",
                strokeColor : "rgba(220,220,220,1)",
                pointColor : getRandomColor(),
                pointStrokeColor : "#fff",
                pointHighlightFill : "#fff",
                pointHighlightStroke : "rgba(220,220,220,1)",
                data : lineDataArray
            }
        ]
    }

    var ctx = document.getElementById("chart-line").getContext("2d");
    if (window.myLine) window.myLine.destroy();
    window.myLine = new Chart(ctx).Line(lineChartData, {responsive: true});
}


/* Google Charts*/

/**
* Draw a Google Map Chart using latitude, longitude and name found in a sensor fields
**/
function drawMap( sensorLat, sensorLong, sensorName ) {

    var data = google.visualization.arrayToDataTable([
        ['Lat', 'Long', 'Name'],
        [ sensorLat, sensorLong, sensorName],
    ]);
    var options = {
        mapType: 'styledMap',
        zoomLevel: 12,
        showTip: true,
        useMapTypeControl: true,
        maps: {
            // Your custom mapTypeId holding custom map styles.
            styledMap: {
                name: 'My Map', // This name will be displayed in the map type control.
                styles: [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},{"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},{"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},{"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"administrative.province","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}]
            }
        }
    };
    var map = new google.visualization.Map(document.getElementById('chart-map'));
    map.draw(data, options);
};

/**
* Draw a Google Trendline Chart using sensor data
* @param	dataArray	A data array as returned by the WoTKit API: [{"id":1, "value":1, ... }, ... ]
**/
function drawTrendlineChart(dataArray) {

    /* Build the data array according to specification
    *  https://developers.google.com/chart/interactive/docs/gallery/trendlines
    */
    var pointsArray = [];
    pointsArray.push(['Data Point','Value']);
    for (var i=0; i < dataArray.length; i++){
        pointsArray.push([i,Math.abs(dataArray[i].value)]);
    }

    var data = google.visualization.arrayToDataTable(pointsArray);

    var options = {
      title: '',
      legend: 'none',
      crosshair: { trigger: 'both', orientation: 'both' },
      trendlines: {
        0: {
          type: 'polynomial',
          degree: 3,
          visibleInLegend: true,
        }
      }
    };

    var gchart = new google.visualization.ScatterChart(document.getElementById('chart-trendline'));
    gchart.draw(data, options);

}


/* HTML DOM Objects*/
/**
* Draw a table given an array of WoTKit data
* @param	dataArray	A data array as returned by the WoTKit API: [{"id":1, "value":1, ... }, ... ]
**/
function drawTable (dataArray) {
    $('#data-table tbody').empty();     
    for (var i=0; i<dataArray.length; i++) {
        $('#data-table tbody').append ('<tr><td>'+dataArray[i].id+
                                       '</td> <td>'+dataArray[i].timestamp_iso+
                                       '</td> <td>'+dataArray[i].value+'</td></tr>');
    }
}


/*Utility functions */

/**
* Get a random HTML color.
* @return		A string in the form #123456
**/
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
* Count the occurrences of elements in an WoTKit data response
* @param	dataArray	A data array as returned by the WoTKit API: [{"id":1, "value":1, ... }, ... ]
* @return			An array containing each value found and the times it appears in data set.
**/

function countDataOccurrences (dataArray) {
    var a = [], b = [], prev;
    var tmpArray = dataArray.slice(); //a trick to clone the object, otherwise you will sort the original dataArray
    tmpArray.sort(function(a,b) {return a.value - b.value} ); //sort in ascending order

    for ( var i = 0; i < tmpArray.length; i++ ) {
        if ( tmpArray[i].value !== prev ) {
            a.push(tmpArray[i].value);
            b.push(1);
        } else {
            b[b.length-1]++;
        }
        prev = tmpArray[i].value;
    }
    return [a, b];
}

/**
* A function to animate the '#loader-bar' element as a loading bar; these are not the droids you're looking for.
**/
function loaderAnimation () {
    $('#loader-bar').animate({
                              width:"100%"
                             }, 500, function() { 
                                 $(this).css({"width":"0%"});
                             } );
}




/**
*  Load Google Chart library and setup listeners after page is reloaded
**/ 

// Google Charts will re-write the document element, thus it needs to be called before
google.load('visualization', '1', { 'packages': ['map', 'corechart'] });

window.onload = function(){

    /*Draw ChartJS Charts*/
    drawPolarChart();            
    drawLineChart({"value":1});

    /*Draw Google Charts*/
    drawMap(49.266290399999995, -123.0985734, 'Sensor'); //Initialize with dummy data
    drawTrendlineChart([{"value":1}]); //Initialize with dummy data

    /*JQuery AJAX Listners*/
    $('#search-form').submit(function(){
        var searchText = $(this).find('input:text').val();
        searchSensors(searchText, updateSensorList);       
        $(this).find('input:text').val("") //update as cleaned
    });

    /*Attach a nice loader animation to all AJAX requests.*/
    $( document ).ajaxComplete(function() {
        loaderAnimation ();
    });

    $('.form-control#search-text').popover("show");


};






