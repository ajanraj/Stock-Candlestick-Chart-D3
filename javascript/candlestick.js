function createChart(ticker) {
  // Declare the chart dimensions and margins.
  const width = 928;
  // const width = 1024;
  const totalWidth = width * 15;
  const height = 600;
  const marginTop = 40;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 60;

  // Declare the positional encodings.
  const x = d3
    .scaleBand()
    .domain(ticker.map((d) => d.Date)) // Use the dates directly from your data
    .range([0, totalWidth])
    .padding(0.2);

  const y = d3
    .scaleLog()
    .domain([
      d3.min(ticker, (d) => d.Low - 1),
      d3.max(ticker, (d) => d.High + 1),
    ])
    .rangeRound([height - marginBottom, marginTop]);

  // Additional scale for the volume data
  const yVolume = d3
    .scaleLinear()
    .domain([0, d3.max(ticker, (d) => d.Volume)])
    .range([height - marginBottom, height * 0.75]); // Adjust the range as needed

  const parent = d3
    .create("div")
    .style("position", "relative")
    .style("width", "100%");

  const stats = parent
    .append("svg")
    .attr("width", "100%")
    .attr("height", 35)
    .style("margin-top", "10px")
    .style("margin-bottom", "1px")
    .style("display", "block");

  // Add a static title element to the SVG container
  const chartTitle = stats
    .append("text")
    // .attr("x", 0)
    .attr("y", marginTop - 25) // Position it slightly above the chart area
    .attr("class", "chart-title")
    .style("font-size", "16px")
    .text("Stock Data Overview"); // Initial static text

  // Add a static title element to the SVG container
  const chartSecondTitle = stats
    .append("text")
    // .attr("x", marginLeft - 10)
    .attr("y", marginTop - 5) // Position it slightly above the chart area
    .attr("class", "chart-title")
    .style("font-size", "16px")
    .text(""); // Initial static text

  // const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

  // Create the svg with the vertical axis.
  const static = parent
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    // .attr("viewBox", [0, 0, width, height])
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("z-index", 1)
    // Y axis
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(
      d3
        .axisLeft(y)
        .tickFormat(d3.format("~f"))
        .tickValues(d3.scaleLinear().domain(y.domain()).ticks())
    )
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("stroke-opacity", 0.2)
        .attr("x2", totalWidth - marginLeft - marginRight)
    )
    .call((g) => g.select(".domain").remove())
    .attr("class", "y-axis");

  // Create a scrolling div containing the area shape and the horizontal axis.

  const body = parent
    .append("div")
    // .attr("viewBox", [0, 0, width, height])
    .style("margin-left", marginLeft + "px")
    .style("overflow-x", "scroll")
    .style("-webkit-overflow-scrolling", "touch");

  // Create the SVG container.
  // const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

  const svg = body
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height)
    .style("display", "block");

  // const svg = abc.append("g").attr("transform", `translate(${15},${0})`);

  // Append the x axes.
  // Append the x axes with ticks for every seventh data point.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(
          ticker.filter((_, index) => index % 7 === 0).map((d) => d.Date)
        )
        .tickFormat(d3.utcFormat("%-m/%-d/%-y"))
    )
    .attr("class", "x-axis");

  // Drawing volume bars
  svg
    .append("g")
    .selectAll("rect")
    .data(ticker)
    .join("rect")
    .attr("x", (d) => x(d.Date))
    .attr("y", (d) => yVolume(d.Volume))
    .attr("height", (d) => height - marginBottom - yVolume(d.Volume))
    .attr("width", x.bandwidth())
    .attr("fill", (d) => (d.Close > d.Open ? "green" : "red"))
    .attr("opacity", 0.3); // Adjust opacity as needed

  // Create a group for each day of data, and append two lines to it.
  const g = svg
    .append("g")
    .attr("stroke-linecap", "butt")
    .attr("stroke", "black")
    .selectAll("g")
    .data(ticker)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.Date) + x.bandwidth() / 2},0)`);

  g.append("line")
    .attr("y1", (d) => y(d.Low))
    .attr("y2", (d) => y(d.High));

  g.append("line")
    .attr("y1", (d) => y(d.Open))
    .attr("y2", (d) => y(d.Close))
    .attr("stroke-width", x.bandwidth())
    .attr("stroke", (d) =>
      d.Open > d.Close
        ? d3.schemeSet1[0]
        : d.Close > d.Open
        ? d3.schemeSet1[2]
        : d3.schemeSet1[8]
    );

  // Append a title (tooltip).
  const formatDate = d3.utcFormat("%B %-d, %Y");
  const formatValue = d3.format(".2f");
  const formatChange = (
    (f) => (y0, y1) =>
      f((y1 - y0) / y0)
  )(d3.format("+.2%"));

  g.append("title").text(
    (d) => `${formatDate(d.Date)}
  Open: ${formatValue(d.Open)}
  Close: ${formatValue(d.Close)} (${formatChange(d.Open, d.Close)})
  Low: ${formatValue(d.Low)}
  High: ${formatValue(d.High)}`
  );

  // Assuming your x-axis uses a scaleBand for dates...
  function findClosestDate(mouseX, scale, dates) {
    const eachBand = scale.step(); // Width of each band
    const index = Math.floor((mouseX - scale.range()[0]) / eachBand);
    // Ensure the index is within the bounds of the dates array
    const boundedIndex = Math.max(0, Math.min(index, dates.length - 1));
    // Format the date to match the axis tick labels
    return d3.utcFormat("%-m/%-d")(dates[boundedIndex]);
  }

  // Append crosshair lines, initially hidden
  const crosshairX = svg
    .append("line")
    .attr("class", "crosshair")
    .attr("stroke", "grey")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("visibility", "hidden");

  const crosshairY = svg
    .append("line")
    .attr("class", "crosshair")
    .attr("stroke", "grey")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("visibility", "hidden");

  // Overlay to capture mouse events
  const mouseG = svg.append("g").attr("class", "mouse-over-effects");

  mouseG
    .append("rect") // append a rect to catch mouse movements
    .attr("width", totalWidth)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", function (event) {
      const mouse = d3.pointer(event);
      const mouseX = mouse[0];
      const mouseY = mouse[1];

      // Find the closest date based on mouseX
      const eachBand = x.step();
      const index = Math.round((mouseX - x.range()[0]) / eachBand);
      const boundedIndex = Math.max(0, Math.min(index, ticker.length - 1));
      // Adjust this to find the nearest band to the mouse pointer
      const closestBandIndex = d3.scan(ticker, (a, b) => {
        return (
          Math.abs(x(a.Date) + x.bandwidth() / 2 - mouseX) -
          Math.abs(x(b.Date) + x.bandwidth() / 2 - mouseX)
        );
      });

      const closestDate = ticker[closestBandIndex].Date;
      const closestX = x(closestDate) + x.bandwidth() / 2;

      // Update crosshair lines position to snap to the closest date
      crosshairX
        .attr("x1", closestX)
        .attr("x2", closestX)
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom)
        .style("visibility", "visible");

      crosshairY
        .attr("x1", marginLeft - 60)
        .attr("x2", totalWidth)
        .attr("y1", mouseY)
        .attr("y2", mouseY)
        .style("visibility", "visible");

      // Highlight X axis value
      // Highlight X axis value and create a box for it
      const closestDateObj = findClosestDate(
        mouseX,
        x,
        x.domain().map((d) => new Date(d))
      );
      const closestDateFormatted = d3.timeFormat("%d %b")(
        new Date(closestDateObj)
      ); // "13 Jan" format

      // Remove existing highlight box and text to prevent duplication
      svg.selectAll(".x-axis-highlight, .x-axis-highlight-text").remove();

      // Append a new rectangle as the highlight background for the x-axis
      svg
        .append("rect")
        .attr("class", "x-axis-highlight")
        .attr("x", mouseX - 25) // Center the box around the cursor. Adjust as needed.
        .attr("y", height - marginBottom) // Position just above the x-axis
        .attr("width", 50) // Make sure the box is wide enough to fit the date text
        .attr("height", 20) // Adjust the height as needed
        .attr("fill", "grey");

      // Append text over the rectangle for the x-axis
      svg
        .append("text")
        .attr("class", "x-axis-highlight-text")
        .attr("x", mouseX - 20) // Adjust this value to center the text within the box
        .attr("y", height - marginBottom + 15) // Adjust for vertical alignment within the box
        .attr("fill", "white")
        .attr("font-size", "12px") // Adjust font size as needed
        .text(closestDateFormatted);

      // Highlight Y axis value
      const yValue = y.invert(mouseY);
      const formattedYValue = d3.format(".2f")(yValue);

      // Remove existing highlight box and text to prevent duplication
      static.selectAll(".y-axis-highlight, .y-axis-highlight-text").remove();

      // Append a new rectangle as the highlight background
      static
        .append("rect")
        .attr("class", "y-axis-highlight")
        .attr("x", -65) // Position as needed, this example places it right next to the y-axis
        .attr("y", mouseY - 10) // Adjust positioning based on mouse Y to align with the pointer
        .attr("width", marginLeft) // Adjust the width as needed
        .attr("height", 20) // Adjust the height as needed
        .attr("fill", "grey");

      // Append text over the rectangle
      static
        .append("text")
        .attr("class", "y-axis-highlight-text")
        .attr("x", -15) // Adjust for padding within the rectangle
        .attr("y", mouseY + 5) // Center text vertically within the rectangle
        .attr("fill", "white")
        .attr("font-size", "12px")
        .text(formattedYValue);

      // Inside the mousemove event handler, after finding the closest data point

      const dataForClosestDate = ticker.find(
        (data) => data.Date.getTime() === closestDate.getTime()
      );

      // Clear existing text to avoid duplication
      chartTitle.text("");

      // Set base text color for labels
      chartTitle.attr("fill", "black");

      // Add dynamic text as tspans
      chartTitle.append("tspan").text("Open: ");
      chartTitle
        .append("tspan")
        .style(
          "fill",
          dataForClosestDate.Close > dataForClosestDate.Open ? "green" : "red"
        )
        .text(`${formatValue(dataForClosestDate.Open)}`);

      chartTitle.append("tspan").text(" | High: ");
      chartTitle
        .append("tspan")
        .attr(
          "fill",
          dataForClosestDate.Close > dataForClosestDate.Open ? "green" : "red"
        )
        .text(`${formatValue(dataForClosestDate.High)}`);

      chartTitle.append("tspan").text(" | Low: ");
      chartTitle
        .append("tspan")
        .attr(
          "fill",
          dataForClosestDate.Close > dataForClosestDate.Open ? "green" : "red"
        )
        .text(`${formatValue(dataForClosestDate.Low)}`);

      chartTitle.append("tspan").text(" | Close: ");
      chartTitle
        .append("tspan")
        .attr(
          "fill",
          dataForClosestDate.Close > dataForClosestDate.Open ? "green" : "red"
        )
        .text(`${formatValue(dataForClosestDate.Close)}`);

      chartTitle.append("tspan").text(" | Change: ");
      chartTitle
        .append("tspan")
        .attr("fill", dataForClosestDate.Change >= 0 ? "green" : "red") // Assuming positive change is green, negative is red
        .text(
          `${formatValue(dataForClosestDate.Change)} (${formatValue(
            dataForClosestDate.ChangePercent
          )}%)`
        );

      chartSecondTitle.text("");

      // Add a second title for the volume data
      chartSecondTitle.append("tspan").text(" Volume: ");
      chartSecondTitle
        .append("tspan")
        .attr("fill", dataForClosestDate.Change >= 0 ? "green" : "red") // Assuming positive change is green, negative is red
        .text(dataForClosestDate.Volume);
    })

    .on("mouseleave", function () {
      // Clean up: remove highlights for both x and y axes
      svg.selectAll(".x-axis-highlight, .x-axis-highlight-text").remove();
      static.selectAll(".y-axis-highlight, .y-axis-highlight-text").remove();
      chartTitle.text("Stock Data Overview");
      crosshairX.style("visibility", "hidden");
      crosshairY.style("visibility", "hidden");
      chartSecondTitle.text("");
    });

  return parent.node();
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
      // Convert date strings to Date objects and numerical strings to numbers, then take the first 30 entries
      const ticker = data.map((d) => ({
        Date: d3.utcParse("%Y-%m-%d")(d.date), // Adjust date format as needed
        Open: +d.open,
        High: +d.high,
        Low: +d.low,
        Close: +d.close,
        Volume: +d.volume,
        Change: +d.change,
        ChangePercent: +d.changePercent,
        // Add other fields if necessary
      }));
      // .slice(0, 500); // Adjust the number of entries as needed

      // Now `ticker` is ready to be used with your chart code
      const chart = createChart(ticker); // Assuming your chart code is encapsulated in a function

      // Clear the previous chart before appending the new one
      const chartContainer = document.getElementById("chart");
      chartContainer.innerHTML = ""; // Clear the container
      chartContainer.appendChild(chart); // Append the new chart
    })
    .catch((error) => {
      console.log(error);
    });
}

// Initially load the chart for the first CSV file listed in the dropdown
loadAndDisplayChart(
  "../Data/" + document.getElementById("stock-selector").value
);

function updateCharts() {
  const file = "../Data/" + document.getElementById("stock-selector").value;

  Promise.all([loadAndDisplayChart(file)]);
}

// Load initial charts
updateCharts();
