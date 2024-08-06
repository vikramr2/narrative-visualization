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
    { date: "04/03/20", event: "CDC Recommends Masks" },
    { date: "12/11/20", event: "Pfizer Vaccine EUA" }
  ],
  "China": [
    { date: "01/23/20", event: "Wuhan Lockdown" },
    { date: "04/08/20", event: "Wuhan Reopens" },
    { date: "12/31/20", event: "Vaccination Rollout" }
  ],
  "Japan": [
    { date: "04/07/20", event: "State of Emergency" },
    { date: "05/25/20", event: "End of State of Emergency" },
    { date: "12/14/20", event: "Vaccination Approval" }
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
              console.log(d.event);  // Log or display tooltip with event details
            })
            .on("mouseout", function() {
              d3.select(this)
                .transition()
                .duration(100)
                .attr("r", 5);
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
    }

    function resetChart() {
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
  })
  .catch(error => console.error(error));
