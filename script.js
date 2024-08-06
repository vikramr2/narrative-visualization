const margin = { top: 20, right: 30, bottom: 40, left: 80 }; // Increased left margin
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

    svg.selectAll(".line")
      .data(countries.map(country => filteredData.filter(d => d.country === country)))
      .enter().append("path")
      .attr("class", "line")
      .attr("d", line)
      .style("stroke", d => color(d[0].country));
  })
  .catch(error => console.error(error));
