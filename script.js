const margin = { top: 20, right: 150, bottom: 40, left: 80 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const parseDate = d3.timeParse("%m/%d/%y");

const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const line = d3.line()
  .x(d => x(d.date))
  .y(d => y(d.cases));

const svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Important dates related to COVID-19 policies
const importantDates = {
  "US": [
    { date: "03/13/20", event: "National Emergency Declaration" },
    { date: "12/11/20", event: "Pfizer Vaccine EUA" },
    { date: "01/01/22", event: "Omicron variant hits US"}
  ],
  "China": [
    { date: "04/08/20", event: "Wuhan Reopens" },
    { date: "02/20/22", event: "Omicron outbreak in Shanghai"},
    { date: "11/01/22", event: "China lifts zero-COVID policies" }
  ],
  "Japan": [
    { date: "12/14/20", event: "Vaccination Approval" },
    { date: "01/15/22", event: "BA.5 Omicron variant hits Japan" },
    { date: "10/11/22", event: "Japan lifts COVID-19 restrictions and opens to tourists" }
  ]
};

d3.csv("data/time_series_covid19_confirmed_global_processed.csv", d3.autoType)
  .then(data => {
    const countries = ["US", "China", "Japan"];
    let filteredData = data.filter(d => countries.includes(d.country));

    filteredData.forEach(d => {
      d.date = parseDate(d.date);
      d.cases = +d.cases;
    });

    filteredData = filteredData.sort((a, b) => a.date - b.date);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(countries);
    let selectedCountry = null;

    function updateChart(data, importantEvents = []) {
      data.sort((a, b) => a.date - b.date);

      // Update scales with transition
      x.domain(d3.extent(data, d => d.date));
      y.domain([0, d3.max(data, d => d.cases)]);

      // Update axes with transition
      svg.selectAll(".x-axis").remove();
      svg.selectAll(".y-axis").remove();
      
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis")
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));

      svg.append("g")
        .attr("class", "y-axis")
        .transition()
        .duration(1000)
        .call(d3.axisLeft(y));

      const lines = svg.selectAll(".line")
        .data(countries.map(country => data.filter(d => d.country === country)));

      lines.enter().append("path")
        .attr("class", "line")
        .merge(lines)
        .transition()  // Apply transition to lines
        .duration(1000)
        .attr("d", line)
        .style("stroke", d => d.length ? color(d[0].country) : null)
        .style("opacity", d => (selectedCountry === null || (d.length && selectedCountry === d[0].country)) ? 0.6 : 0)
        .style("stroke-width", 15)
        .attr("data-country", d => d.length ? d[0].country : null);

      lines.exit().remove();

      svg.selectAll(".line")
        .on("mouseover", function() {
          if (selectedCountry === null) {
            d3.select(this)
              .transition()
              .duration(200)
              .style("opacity", 1);
          }
        })
        .on("mouseout", function() {
          if (selectedCountry === null) {
            d3.select(this)
              .transition()
              .duration(200)
              .style("opacity", 0.6);
          }
        })
        .on("click", function(event, d) {
          if (selectedCountry === d[0].country) {
            resetChart();
          } else {
            drillDown(d[0].country);
          }
        });

      // Remove existing circles
      svg.selectAll(".important-circle").remove();

      // Draw circles for important dates if any
      // Draw circles for important dates if any
      if (selectedCountry !== null && importantEvents.length > 0) {
        const circles = svg.selectAll(".important-circle")
          .data(importantEvents.map(e => ({
            date: parseDate(e.date),
            cases: data.find(d => d.date.getTime() === parseDate(e.date).getTime())?.cases || 0,
            event: e.event
          })));
    
        circles.enter().append("circle")
          .attr("class", "important-circle")
          .attr("cx", d => x(d.date))
          .attr("cy", d => y(d.cases))
          .attr("r", 0)
          .attr("fill", "red")
          .attr("stroke", "black")
          .on("mouseover", function(event, d) {
            d3.select(this)
              .transition()
              .duration(100)
              .attr("r", 8);
          })
          .on("mouseout", function(d, i, nodes) {
            if (!d3.select(nodes[i]).classed("clicked")) {
              d3.select(this)
                .transition()
                .duration(100)
                .attr("r", 5);
            }
          })
          .on("click", function(event, d) {
            const circle = d3.select(this);
            const isActive = circle.classed("clicked");
    
            // Reset all circles to normal size and remove 'clicked' class
            svg.selectAll(".important-circle")
              .classed("clicked", false)
              .transition()
              .duration(100)
              .attr("r", 5);
    
            if (isActive) {
              // If the clicked circle was already active, deactivate it
              const drillDownText = `Currently showing the curve of ${selectedCountry}. Click on a red circle to show the corresponding event in the timeline.`;
              updateDynamicText(drillDownText);
            } else {
              // Enlarge clicked circle and mark it as clicked
              circle
                .classed("clicked", true)
                .transition()
                .duration(100)
                .attr("r", 8);
    
              // Update dynamic text with the event description
              updateDynamicText(`Event: ${d.event}`);
            }
          })
          .transition()
          .duration(1000)
          .attr("r", 5);
    
        circles.exit().remove();
      }
    }

    function drillDown(country) {
      selectedCountry = country;
      const countryData = filteredData.filter(d => d.country === country);
      const importantEvents = importantDates[country] || [];
      updateChart(countryData, importantEvents);

      const drillDownText = `Currently showing the curve of ${country}. Click on a red circle to show the corresponding event in the timeline.`;
      updateDynamicText(drillDownText);
    }

    function resetChart() {
      updateDynamicText(welcomeText);
      selectedCountry = null;
      updateChart(filteredData);
      svg.selectAll(".line")
        .style("opacity", 0.6);
      svg.selectAll(".legend")
        .style("opacity", 0.6);
    }

    updateChart(filteredData);

    const legendPanel = svg.append("g")
      .attr("transform", `translate(${width + 10}, 0)`);

    legendPanel.append("rect")
      .attr("x", -10)
      .attr("y", 0)
      .attr("width", 130)
      .attr("height", countries.length * 20 + 10)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("rx", 5)
      .attr("ry", 5);

    const legend = legendPanel.selectAll(".legend")
      .data(countries)
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20 + 5})`)
      .style("opacity", 0.6)
      .on("mouseover", function() {
        if (selectedCountry === null) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1);
        }
      })
      .on("mouseout", function() {
        if (selectedCountry === null) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.6);
        }
      })
      .on("click", function(event, d) {
        if (selectedCountry === d) {
          resetChart();
        } else {
          drillDown(d);
        }
      });

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", color);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(d => d);

    // Add welcome message box below the legend panel
    const welcomeText = "Welcome to the visualization, click on a curve or legend item to drill down into a single country's COVID data. Click on the curve or legend item again to return to normal.";

    // Define text wrapping function
    function wrapText(text, width) {
        text.each(function() {
            var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

            while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
            }
        });
    }

    // Function to update dynamic text
    function updateDynamicText(message) {
        d3.select("#dynamic-text")
        .text(message)
        .call(wrapText, legendPanelWidth);
    }

    // Add the welcome message
    const legendPanelWidth = 130; // Width of the legend panel
    const legendPanelX = width + 10; // Adjust based on the actual positioning of the legend panel
    const legendPanelY = countries.length * 20 + 20; // Positioning based on legend items

    legendPanel.append("text")
    .attr("id", "dynamic-text")
    .attr("x", legendPanelX)
    .attr("y", legendPanelY + 50) // Space between the legend and the welcome text
    .attr("dy", "1em")
    .attr("text-anchor", "start")
    .attr("class", "welcome-text")
    .style("font-size", "14px")
    .style("fill", "#333")
    .text(welcomeText)
    .call(wrapText, legendPanelWidth); // Wrap text to fit within legend panel width
  })
  .catch(error => console.error(error));
