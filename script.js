const margin = { top: 20, right: 150, bottom: 40, left: 80 }; // Increased right margin for legend
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

d3.csv("data/time_series_covid19_confirmed_global_processed.csv", d3.autoType)
  .then(data => {
    const countries = ["US", "China", "Japan"];
    const filteredData = data.filter(d => countries.includes(d.country));

    filteredData.forEach(d => {
      d.date = parseDate(d.date);
      d.cases = +d.cases;
    });

    // Sort the data by date
    filteredData.sort((a, b) => a.date - b.date);

    x.domain(d3.extent(filteredData, d => d.date));
    y.domain([0, d3.max(filteredData, d => d.cases)]);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(countries);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));

    const countryData = countries.map(country => filteredData.filter(d => d.country === country));

    // Draw the lines
    const lines = svg.selectAll(".line")
      .data(countryData)
      .enter().append("path")
      .attr("class", "line")
      .attr("d", line)
      .style("stroke", d => color(d[0].country))
      .style("opacity", 0.6) // Set initial opacity
      .style("stroke-width", 15) // Set stroke width
      .attr("data-country", d => d[0].country); // Add a data attribute for country

    // Hover interaction for lines
    lines.on("mouseover", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 0.6);
      });

    // Legend Panel
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

    // Legend Items
    const legend = legendPanel.selectAll(".legend")
      .data(countries)
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20 + 5})`)
      .style("opacity", 0.6) // Set initial opacity for legend entries
      .on("mouseover", function(event, d) {
        // Increase opacity for the legend item and corresponding line
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1);
        svg.selectAll(".line")
          .filter(lineData => lineData[0].country === d)
          .transition()
          .duration(200)
          .style("opacity", 1);
      })
      .on("mouseout", function(event, d) {
        // Revert the opacity of the legend item and corresponding line
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 0.6);
        svg.selectAll(".line")
          .filter(lineData => lineData[0].country === d)
          .transition()
          .duration(200)
          .style("opacity", 0.6);
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
