// 使用 D3.js 从 GitHub 仓库加载数据
d3.csv("https://raw.githubusercontent.com/zzzmmmlll/covid-visualization/refs/heads/master/data/cleaned_covid_19_clean_complete.csv")
    .then(function (data) {
        // 数据处理：将日期转化为日期对象，其他数值转换为数字
        data.forEach(d => {
            d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
            d.Confirmed = +d.Confirmed;
            d.Deaths = +d.Deaths;
            d.Recovered = +d.Recovered;
        });

        // 获取所有国家的列表
        const countries = [...new Set(data.map(d => d["Country/Region"]))];

        // 填充下拉框
        const countrySelect = d3.select("#country-select");
        countries.forEach(country => {
            countrySelect.append("option")
                .attr("value", country)
                .text(country);
        });

        // 默认选择第一个国家并展示数据
        const selectedCountry = countries[0];
        renderChart(data, selectedCountry);

        // 当用户选择新的国家时更新图表
        countrySelect.on("change", function () {
            const selectedCountry = this.value;
            renderChart(data, selectedCountry);
        });
        // 选择切换按钮和容器
        const showCurveBtn = d3.select("#show-curve");
        const showMapBtn = d3.select("#show-map");
        const chartContainer = d3.select("#chart-container");
        const mapContainer = d3.select("#map-container");

        // 切换视图逻辑
        showCurveBtn.on("click", () => {
            chartContainer.classed("active", true);
            mapContainer.classed("active", false);
            showCurveBtn.classed("active", true).classed("inactive", false);
            showMapBtn.classed("active", false).classed("inactive", true);
        });

        showMapBtn.on("click", () => {
            chartContainer.classed("active", false);
            mapContainer.classed("active", true);
            showCurveBtn.classed("active", false).classed("inactive", true);
            showMapBtn.classed("active", true).classed("inactive", false);
        });

        // 绘制图表的函数
        function renderChart(data, country) {
            // 筛选出选择国家的数据
            const countryData = data.filter(d => d["Country/Region"] === country);

            // 设置图表的尺寸
            const width = 900, height = 500;
            const margin = { top: 20, right: 30, bottom: 50, left: 60 };

            // 创建SVG画布，并将其居中
            const svg = d3.select("#chart").html("").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // 设置X轴和Y轴的比例尺
            const x = d3.scaleTime()
                .domain(d3.extent(countryData, d => d.Date))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(countryData, d => Math.max(d.Confirmed, d.Deaths, d.Recovered))])
                .range([height, 0]);

            // 绘制X轴
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(d3.timeMonth));

            // 绘制Y轴
            svg.append("g")
                .call(d3.axisLeft(y));

            // 绘制折线
            const lineConfirmed = d3.line()
                .x(d => x(d.Date))
                .y(d => y(d.Confirmed));

            const lineDeaths = d3.line()
                .x(d => x(d.Date))
                .y(d => y(d.Deaths));

            const lineRecovered = d3.line()
                .x(d => x(d.Date))
                .y(d => y(d.Recovered));

            // 添加折线
            const lines = svg.selectAll(".line")
                .data([lineConfirmed, lineDeaths, lineRecovered])
                .enter().append("path")
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", (d, i) => i === 0 ? "blue" : i === 1 ? "red" : "green")
                .attr("stroke-width", 2)
                .attr("d", (d, i) => i === 0 ? lineConfirmed(countryData) :
                    i === 1 ? lineDeaths(countryData) : lineRecovered(countryData));

            // 添加图例
            const legend = svg.append("g")
                .attr("transform", `translate(${width - 150},20)`);

            legend.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", "blue");

            legend.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .text("Confirmed");

            legend.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", "red")
                .attr("y", 20);

            legend.append("text")
                .attr("x", 20)
                .attr("y", 30)
                .text("Deaths");

            legend.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", "green")
                .attr("y", 40);

            legend.append("text")
                .attr("x", 20)
                .attr("y", 50)
                .text("Recovered");

            // 定义缩放行为
            const zoom = d3.zoom()
                .scaleExtent([1, 10])
                .on("zoom", zoomed);

            // 应用缩放行为
            svg.call(zoom);

            // 缩放函数
            function zoomed(event) {
                svg.attr("transform", event.transform);
            }

            // 放大和缩小按钮事件
            d3.select("#zoom-in").on("click", function () {
                svg.transition().call(zoom.scaleBy, 1.2);
            });

            d3.select("#zoom-out").on("click", function () {
                svg.transition().call(zoom.scaleBy, 0.8);
            });


            // 创建 Tooltip 元素
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background", "rgba(0,0,0,0.6)")
                .style("color", "#fff")
                .style("border-radius", "5px")
                .style("padding", "10px")
                .style("font-size", "12px")
                .style("pointer-events", "none");

            // 绘制数据点
            svg.selectAll(".dot")
                .data(countryData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.Date))
                .attr("cy", d => y(d.Confirmed))
                .attr("r", 5)
                .attr("fill", "blue")
                .on("mouseover", function (event, d) {
                    tooltip.style("visibility", "visible")
                        .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.Date)}<br>Confirmed: ${d.Confirmed}`);
                })
                .on("mousemove", function (event) {
                    tooltip.style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("visibility", "hidden");
                });
        }
        function renderMap() {
            const geoJsonUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
            const covidDataUrl = "https://raw.githubusercontent.com/zzzmmmlll/covid-visualization/refs/heads/master/data/cleaned_covid_19_clean_complete.csv";

            const svg = d3.select("#map");
            const width = 1200;
            const height = 600;
            const projection = d3.geoNaturalEarth1().scale(150).translate([width / 2, height / 2]);
            const path = d3.geoPath().projection(projection);

            Promise.all([d3.json(geoJsonUrl), d3.csv(covidDataUrl)]).then(([geoData, covidData]) => {
                covidData.forEach(d => {
                    d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
                    d.Confirmed = +d.Confirmed;
                    d.Deaths = +d.Deaths;
                    d.Recovered = +d.Recovered;
                });

                const nestedData = d3.group(covidData, d => d.Date);
                const dates = Array.from(nestedData.keys()).sort(d3.ascending);

                svg.append("g")
                    .selectAll("path")
                    .data(geoData.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", "#ccc")
                    .attr("stroke", "#333");

                // 示例更新地图数据
                function updateMap(selectedDate) {
                    console.log("Updating map for date:", selectedDate);
                }

                // 初始化
                updateMap(dates[0]);
            });
        }

        // 初始化渲染
        renderCurve();
        renderMap();

        // 创建选择框
        const filterContainer = d3.select("#filter-container")
            .append("input")
            .attr("type", "checkbox")
            .attr("id", "show-confirmed")
            .attr("checked", true)
            .text("Show Confirmed")
            .on("change", updateChart);

        // 更新图表的函数
        function updateChart() {
            const showConfirmed = d3.select("#show-confirmed").property("checked");
            if (showConfirmed) {
                svg.append("path")
                    .data([countryData])
                    .attr("class", "line")
                    .attr("fill", "none")
                    .attr("stroke", "blue")
                    .attr("stroke-width", 2)
                    .attr("d", lineConfirmed);
            } else {
                svg.select(".line")
                    .remove();
            }
        }
    })
    .catch(function (error) {
        console.log(error);
    });
