function createChart(ticker) {
  // Declare the chart dimensions and margins.
  const width = 928;
  const height = 600;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 60;

  // Declare the positional encodings.
  const x = d3
    .scaleBand()
    .domain(
      d3.utcDay
        .range(ticker.at(0).Date, +ticker.at(-1).Date + 1)
        .filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6)
    )
    .range([marginLeft, width - marginRight])
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

  // Create the SVG container.
  const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);

  // Append the axes.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(
          d3.utcMonday
            .every(width > 720 ? 1 : 2)
            .range(ticker.at(0).Date, ticker.at(-1).Date)
        )
        .tickFormat(d3.utcFormat("%-m/%-d"))
    )
    // .call((g) => g.select(".domain").remove())
    .attr("class", "x-axis");

  svg
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
        .attr("x2", width - marginLeft - marginRight)
    )
    // .call((g) => g.select(".domain").remove())
    .attr("class", "y-axis");

  // Append the volume axis (right side)
  // svg
  //   .append("g")
  //   .attr("transform", `translate(${width - marginRight},0)`)
  //   .call(d3.axisRight(yVolume).ticks(3)) // Adjust tick count as needed
  //   .attr("class", "volume-axis");

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

  // Add a static title element to the SVG container
  const chartTitle = svg
    .append("text")
    .attr("x", marginLeft - 10)
    .attr("y", marginTop - 5) // Position it slightly above the chart area
    .attr("class", "chart-title")
    .style("font-size", "16px")
    .text("Stock Data Overview"); // Initial static text

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
    .attr("width", width)
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
        .attr("x1", marginLeft)
        .attr("x2", width - marginRight)
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
      svg.selectAll(".y-axis-highlight, .y-axis-highlight-text").remove();

      // Append a new rectangle as the highlight background
      svg
        .append("rect")
        .attr("class", "y-axis-highlight")
        .attr("x", 0) // Position as needed, this example places it right next to the y-axis
        .attr("y", mouseY - 10) // Adjust positioning based on mouse Y to align with the pointer
        .attr("width", marginLeft - 1) // Adjust the width as needed
        .attr("height", 20) // Adjust the height as needed
        .attr("fill", "grey");

      // Append text over the rectangle
      svg
        .append("text")
        .attr("class", "y-axis-highlight-text")
        .attr("x", 5) // Adjust for padding within the rectangle
        .attr("y", mouseY + 5) // Center text vertically within the rectangle
        .attr("fill", "white")
        .attr("font-size", "12px")
        .text(formattedYValue);

      chartTitle.text((d) => {
        // Find the data for the closest date
        const dataForClosestDate = ticker.find(
          (data) => data.Date.getTime() === closestDate.getTime()
        );
        // Format the title string with relevant information
        return `Open: ${formatValue(
          dataForClosestDate.Open
        )} - High: ${formatValue(dataForClosestDate.High)} - Low: ${formatValue(
          dataForClosestDate.Low
        )} - Close: ${formatValue(dataForClosestDate.Close)}`;
      });
    })
    .on("mouseleave", function () {
      // Clean up: remove highlights for both x and y axes
      svg.selectAll(".x-axis-highlight, .x-axis-highlight-text").remove();
      svg.selectAll(".y-axis-highlight, .y-axis-highlight-text").remove();
      chartTitle.text("Stock Data Overview");
      crosshairX.style("visibility", "hidden");
      crosshairY.style("visibility", "hidden");
    });

  return svg.node();
}

// Load and parse the CSV file
d3.csv("test.csv")
  .then((data) => {
    // Convert date strings to Date objects and numerical strings to numbers
    const ticker = data.map((d) => ({
      Date: d3.utcParse("%Y-%m-%d")(d.date), // Adjust date format as needed
      Open: +d.open,
      High: +d.high,
      Low: +d.low,
      Close: +d.close,
      Volume: +d.volume,
      // Add other fields if necessary
    }));

    // Now `ticker` is ready to be used with your chart code
    // For example, you can call your chart function here
    const chart = createChart(ticker); // Assuming your chart code is encapsulated in a function
    document.body.append(chart); // Append the chart to the document body or another DOM element
  })
  .catch((error) => {
    console.log(error);
  });
