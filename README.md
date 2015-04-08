===========================
WoTKit Example using JQuery
===========================

This application exemplifies using the WoTKit to search and access public sensors. We use public data to build a simple dashboard.

Dependencies
============

* Jquery > 1.11.2
* ChartJS > 1.0.2
* Bootstrap > 3.3.4

Key Points
==========

* This example will show you how to search for public sensors and visualize their data.
* It will help you understand how to visualize data using ChartJS (http://chartjs.org) and google charts (https://developers.google.com/chart/).
* Private sensors requiring authentication are not discussed in this example.

Code Walkthrough
================

This example application demonstrates using the WoTKit to visualize data. We use Bootstrap (http://getbootstrap.com) to build the dashboard and use JQuery to manipulate our page's DOM. We leverage different chart libraries to visualize data (ChartJS and Google Charts), but the examples can be extended to the library of your liking.

## index.html

This file is a standard dashboard example using Bootstrap. You can read more about it here: http://getbootstrap.com/getting-started/#template

## css/dashboard.css

This CSS file is quite simple and can help you modify the style of the application to fit your branding.

## js/Chart-1.0.2.min

This file is provided by the ChartJS.org project and can be accessed via its project page: http://www.chartjs.org/

## js/WoTKitexample.js


### Accessing the WoTKit API

Making a call to the WoTKit API using JQuery's Ajax function is simple. For example, to create a function that uses the sensors endpoint to query public sensors (http://wotkit.readthedocs.org/en/1.9.0/api_v1/api_sensors.html#querying-sensors)

```javascript
function searchSensors (searchText, callBack) {
   var WOTKIT_URL = "http://wotkit.sensetecnic.com/api/v1";
   $.ajax({
      type:"GET",
      url:WOTKIT_URL+'/sensors?text='+encodeURIComponent(searchText),
      success: function(data){callBack(data)}
   });
}
```

However, it is good practice to encapsulate several API calls in one object. We will create a sensor object


```javascript
function Sensor(sensorName) {

   var WOTKIT_URL = "http://wotkit.sensetecnic.com/api/v1";

   /**
   * Makes a GET call to the data endpoint of the WoTKit API
   * @param	callback: A function that will be executed when completed
   * @param	beforeE: The number of elements before the query time.
   * @return	The callback function will be executed.
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
   };

   /**
   * Makes a GET call to the fields endpoint of the WoTKit API
   * @param	callback: A function that will be executed when completed.
   * @return	The callback function will be executed.
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
   };
};
```

We can now access the API via the sensor object like this:

```javascript
var sensor = new Sensor(sensorName);
sensor.getFields(function(data){/*Your code*/})
```
### Using Sensor Fields

WoTKit sensor fields have meta-information regarding the sensor, like the sensor's position (Long, Lat), and name (http://wotkit.readthedocs.org/en/1.9.0/api_v1/api_sensor_fields.html). 

Let's then use this information to create a Google Chart Map to visualize the position of our sensor (https://developers.google.com/chart/interactive/docs/gallery/map)


```javascript
var sensor = new Sensor(sensorName); //Create a new sensor object 
sensor.getFields( function (fieldsArray) { //Call the WoTKit API
   //Let's create a hash-type object to easily search for fields.
   var fieldsArrayHash = {};
   for (var i=0; i<fieldsArray.length; i++ ) {  
      fieldsArrayHash[fieldsArray[i].name] = fieldsArray[i].value;
   }
   drawMap(fieldsArrayHash["lat"], fieldsArrayHash["lng"], 'Sensor');
});

/*
* The full implementation of the drawMap function is specified at:
* https://developers.google.com/chart/interactive/docs/gallery/map
*/
function drawMap( sensorLat, sensorLong, sensorName ) {
   var data = google.visualization.arrayToDataTable([
      ['Lat', 'Long', 'Name'],
      [] sensorLat, sensorLong, sensorName],
   ]);
   var options = {
      mapType: 'styledMap',
      zoomLevel: 12,
      showTip: true,
      useMapTypeControl: true
   };
   var map = new google.visualization.Map(document.getElementById('chart-map'));
   map.draw(data, options);
};
```

### Using Sensor Data

The WoTKit allows you to retrieve raw data of a sensor via the data endpoint (http://wotkit.readthedocs.org/en/1.9.0/api_v1/api_sensor_data.html#raw-data-retrieval). Let's use this data to build three charts: A simple line chart using ChartJS, and a polar chart after analyzing the raw data using ChartJS.


* Drawing data directly.

A very simple way of visualizing our data is by building a line chart of values returned.

```javascript
var sensor = new Sensor(sensorName); //Create a new sensor object 

sensor.getData(function (dataArray) { //callback function
   drawLineChart(dataArray);
}, 10); //Number of previous data points to get

function drawLineChart (dataArray) {

   /* Build the data array according to specification
   *  http://www.chartjs.org/docs/#line-chart
   */
   var lineDataArray = [];
   for (var i=0; i < dataArray.length; i++){
      lineDataArray.push(Math.abs(dataArray[i].value));
   }

   /*
   * The complete specification of this chart can be found
   * http://www.chartjs.org/docs/#line-chart
   */

   var lineChartData = {
      labels : ["1","2","3","4","5","6","7","8","9","10"],
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

   //get the <canvas id="chart-line"></canvas> DOM element
   var ctx = document.getElementById("chart-line").getContext("2d"); 
   if (window.myLine) window.myLine.destroy();
   window.myLine = new Chart(ctx).Line(lineChartData, {responsive: true});
}
```

* Drawing data after analyzing it, e.g. a polar chart.

We can also analyze the data and use our analysis to draw a chart. Let's write a function to count the number of times (occurrences) that a data value appears in the sensor data array received from the API. As a bonus let's learn how to append data to an existent ChartJS

```javascript
var sensor = new Sensor(sensorName); //Create a new sensor object 

sensor.getData(function (dataArray) { //callback function
   drawPolarChart(); //Reinitialize in this chart. 
   var occurrences = countDataOccurrences(dataArray); 
   for (var i=0; i < occurrences[0].length; i++){ //append each datapoint
      window.myPolarArea.addData({
         value: Math.abs(occurrences[1][i]),
         color: "#123456"
         highlight: "#999999",
         label: "Occurrences of Value " + occurrences[0][i].toString()
      });
   }
   window.myPolarArea.update(); //redraw the chart
}, 10); //Number of previous data points to get

/*Our function to count the # of times a data value appears in the dataset*/
function countDataOccurrences (dataArray) {
   var a = [], b = [], prev;
   //A trick to clone the object, otherwise you will sort the original:
   var tmpArray = dataArray.slice(); 
   tmpArray.sort(function(a,b) {return a.value - b.value} ); //sort ascending

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


/* Draw the polar chart 
*  http://www.chartjs.org/docs/#polar-area-chart
*/
function drawPolarChart (){
   //get the <canvas id="chart-polar"></canvas> object:
   var ctx = document.getElementById("chart-polar").getContext("2d"); 
   if (window.myPolarArea) window.myPolarArea.destroy();
   window.myPolarArea = new Chart(ctx).PolarArea( [], {responsive:true});
};
```


