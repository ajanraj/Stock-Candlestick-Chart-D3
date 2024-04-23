function createChart(ticker) {
  // Declare the chart dimensions and margins.
  const width = 928;
  const height = 500;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc(
    d3.extent(ticker, (d) => d.Date),
    [marginLeft, width - marginRight]
  );

  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear(
    [0, d3.max(ticker, (d) => d.Close)],
    [height - marginBottom, marginTop]
  );

  // Declare the line generator.
  const line = d3
    .line()
    .x((d) => x(d.Date))
    .y((d) => y(d.Close));

  // Create the SVG container.
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%")
    .attr("height", "100%")
    .attr(
      "style",
      "max-width: 100%; height: auto; height: intrinsic; font: 10px sans-serif;"
    )
    .style("-webkit-tap-highlight-color", "transparent")
    .style("overflow", "visible")
    .on("pointerenter pointermove", pointermoved)
    .on("pointerleave", pointerleft)
    .on("touchstart", (event) => event.preventDefault());

  // Add the x-axis.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(width / 80)
        .tickSizeOuter(0)
    );

  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(height / 40))
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - marginLeft - marginRight)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -marginLeft)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Daily Close ($)")
    );

  // Append a path for the line.
  svg
    .append("path")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line(ticker));

  // Create the tooltip container.
  const tooltip = svg.append("g");

  function formatValue(value) {
    return value.toLocaleString("en", {
      style: "currency",
      currency: "USD",
    });
  }

  function formatDate(date) {
    return date.toLocaleString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  // Add the event listeners that show or hide the tooltip.
  const bisect = d3.bisector((d) => d.Date).center;
  function pointermoved(event) {
    const i = bisect(ticker, x.invert(d3.pointer(event)[0]));
    tooltip.style("display", null);
    tooltip.attr(
      "transform",
      `translate(${x(ticker[i].Date)},${y(ticker[i].Close)})`
    );

    const path = tooltip
      .selectAll("path")
      .data([,])
      .join("path")
      .attr("fill", "white")
      .attr("stroke", "black");

    const text = tooltip
      .selectAll("text")
      .data([,])
      .join("text")
      .call((text) =>
        text
          .selectAll("tspan")
          .data([formatDate(ticker[i].Date), formatValue(ticker[i].Close)])
          .join("tspan")
          .attr("x", 0)
          .attr("y", (_, i) => `${i * 1.1}em`)
          .attr("font-weight", (_, i) => (i ? null : "bold"))
          .text((d) => d)
      );

    size(text, path);
  }

  function pointerleft() {
    tooltip.style("display", "none");
  }

  // Wraps the text with a callout path of the correct size, as measured in the page.
  function size(text, path) {
    const { x, y, width: w, height: h } = text.node().getBBox();
    text.attr("transform", `translate(${-w / 2},${15 - y})`);
    path.attr(
      "d",
      `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`
    );
  }

  return svg.node();
}

document
  .getElementById("stock-selector")
  .addEventListener("change", function () {
    const selectedFile = this.value; // Get the selected file from the dropdown
    loadAndDisplayChart("../Data/" + selectedFile); // Load and display the chart for the selected file
  });

// Function to load and parse the CSV file, then display the chart
function loadAndDisplayChart(csvFile) {
  d3.csv(csvFile)
    .then((data) => {
      const ticker = data.map((d) => ({
        Date: d3.utcParse("%Y-%m-%d")(d.date), // Adjust date format as needed
        Open: +d.open,
        High: +d.high,
        Low: +d.low,
        Close: +d.close,
        Volume: +d.volume,
        Change: +d.change,
        ChangePercent: +d.changePercent,
      }));

      const chart = createChart(ticker); // Create the chart
      const chartContainer = document.getElementById("close-chart");
      chartContainer.innerHTML = ""; // Clear the container
      chartContainer.appendChild(chart); // Append the new chart
    })
    .catch((error) => {
      console.log(error);
    });
}

function updateCharts() {
  const file = "../Data/" + document.getElementById("stock-selector").value;

  Promise.all([loadAndDisplayChart(file)]);
}

// Load initial charts
updateCharts();
