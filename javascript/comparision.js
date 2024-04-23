function createChart(ticker1, ticker2) {
  // Declare the chart dimensions and margins.
  const width = 928;
  const height = 500;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 40;

  // Declare the x (horizontal position) scale.
  const x = d3.scaleUtc(
    d3.extent(ticker1, (d1) => d1.Date),
    [marginLeft, width - marginRight]
  );

  // Declare the y (vertical position) scale.
  // Combining the Close values of both datasets to find the overall max
  const combinedMaxClose = d3.max([
    ...ticker1.map((d) => d.Close),
    ...ticker2.map((d) => d.Close),
  ]);

  const y = d3.scaleLinear(
    [0, combinedMaxClose], // Domain from 0 to the maximum Close value in both datasets
    [height - marginBottom, marginTop] // Range for the scale
  );

  // Declare the line generator.
  const line1 = d3
    .line()
    .x((d1) => x(d1.Date))
    .y((d1) => y(d1.Close));

  // Declare the line generator.
  const line2 = d3
    .line()
    .x((d2) => x(d2.Date))
    .y((d2) => y(d2.Close));

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
    .attr("d", line1(ticker1));

  svg
    .append("path")
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 1.5)
    .attr("d", line2(ticker2));

  const stock1 =
    document.getElementById("stock-selector1").selectedOptions[0].text;
  const stock2 =
    document.getElementById("stock-selector2").selectedOptions[0].text;

  // Append legend at the top right corner of the chart
  const stocks = [
    { name: stock1, color: "steelblue" },
    { name: stock2, color: "red" },
  ];

  // Append legend at the top right corner of the chart
  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - marginRight - 50},${marginTop - 40})`
    )
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "end")
    .selectAll("g")
    .data(stocks) // Use the stocks array for legend data
    .join("g")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  // Append a rectangle to each legend entry
  legend
    .append("rect")
    .attr("x", 30)
    .attr("width", 19)
    .attr("height", 19)
    .attr("fill", (d) => d.color); // Use color from the stock object

  // Append text to each legend entry
  legend
    .append("text")
    .attr("x", 24)
    .attr("y", 9.5)
    .attr("dy", "0.35em")
    .text((d) => d.name); // Use name from the stock object

  // Create the tooltip container for stock 1.
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
  const bisect = d3.bisector((d1) => d1.Date).center;

  function pointermoved(event) {
    const pointerX = d3.pointer(event)[0]; // Get the x position of the pointer
    const date1 = x.invert(pointerX); // Convert the x position to a date using scale x for ticker1
    const date2 = x.invert(pointerX); // Same for ticker2

    const i1 = bisect(ticker1, date1); // Find index of nearest data point in ticker1
    const i2 = bisect(ticker2, date2); // Find index of nearest data point in ticker2

    // Show tooltip for ticker1
    tooltip
      .style("display", null)
      .attr(
        "transform",
        `translate(${x(ticker1[i1].Date)},${y(ticker1[i1].Close)})`
      );

    // Setup tooltip for ticker1
    generateTooltipContent(tooltip, ticker1[i1]);

    // Show tooltip for ticker2
    const tooltip2 = svg
      .selectAll(".tooltip2")
      .data([null])
      .join("g")
      .classed("tooltip2", true);

    tooltip2
      .style("display", null)
      .attr(
        "transform",
        `translate(${x(ticker2[i2].Date)},${y(ticker2[i2].Close)})`
      );

    // Setup tooltip for ticker2
    generateTooltipContent(tooltip2, ticker2[i2]);
  }

  function generateTooltipContent(tooltip, data) {
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
          .data([formatDate(data.Date), formatValue(data.Close)])
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
    svg.selectAll(".tooltip2").style("display", "none");
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
  .getElementById("stock-selector1")
  .addEventListener("change", function () {
    updateCharts();
  });

document
  .getElementById("stock-selector2")
  .addEventListener("change", function () {
    updateCharts();
  });

// Function to load and parse the CSV file, then return the processed data
function loadChart(csvFile, index) {
  if (index === 1) {
    return d3
      .csv(csvFile)
      .then((data) => {
        return data.map((d1) => ({
          Date: d3.utcParse("%Y-%m-%d")(d1.date),
          Open: +d1.open,
          High: +d1.high,
          Low: +d1.low,
          Close: +d1.close,
          Volume: +d1.volume,
          Change: +d1.change,
          ChangePercent: +d1.changePercent,
        }));
      })
      .catch((error) => {
        console.error("Error loading chart data:", error);
      });
  } else {
    return d3
      .csv(csvFile)
      .then((data) => {
        return data.map((d2) => ({
          Date: d3.utcParse("%Y-%m-%d")(d2.date),
          Open: +d2.open,
          High: +d2.high,
          Low: +d2.low,
          Close: +d2.close,
          Volume: +d2.volume,
          Change: +d2.change,
          ChangePercent: +d2.changePercent,
        }));
      })
      .catch((error) => {
        console.error("Error loading chart data:", error);
      });
  }
}

function updateCharts() {
  const file1 = "../Data/" + document.getElementById("stock-selector1").value;
  const file2 = "../Data/" + document.getElementById("stock-selector2").value;

  Promise.all([loadChart(file1, 1), loadChart(file2, 2)]).then((values) => {
    displayChart(values[0], values[1]);
  });
}

function displayChart(ticker1, ticker2) {
  const chart = createChart(ticker1, ticker2); // Assuming createChart creates a chart from the dataset

  const chartContainer = document.getElementById("chart");

  chartContainer.innerHTML = ""; // Clear previous content

  chartContainer.appendChild(chart); // Append new chart
}

// Load initial charts
updateCharts();
