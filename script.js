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
        renderChart(data, selectedCountry); // 默认展示曲线图

        // 当用户选择新的国家时更新曲线图
        countrySelect.on("change", function () {
            const selectedCountry = this.value;
            renderChart(data, selectedCountry);
        });

        // 按钮选择器
        const showCurveBtn = d3.select("#show-curve");
        const showMapBtn = d3.select("#show-map");
        const chartContainer = d3.select("#chart-container");
        const mapContainer = d3.select("#map-container");

        // 切换视图逻辑
        showCurveBtn.on("click", () => {
            chartContainer.style("display", "block");
            mapContainer.style("display", "none");
            renderChart(data, selectedCountry);
        });

        showMapBtn.on("click", () => {
            chartContainer.style("display", "none");
            mapContainer.style("display", "block");
            renderMap(data);
        });

        // 绘制曲线图函数
        function renderChart(data, country) {
            // 筛选出选择国家的数据
            const countryData = data.filter(d => d["Country/Region"] === country);

            // 设置图表的尺寸
            const width = 900, height = 500;
            const margin = { top: 20, right: 30, bottom: 50, left: 60 };

            // 创建SVG画布
            const svg = d3.select("#chart").html("").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // 设置比例尺
            const x = d3.scaleTime()
                .domain(d3.extent(countryData, d => d.Date))
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(countryData, d => Math.max(d.Confirmed, d.Deaths, d.Recovered))])
                .range([height, 0]);

            // 绘制X轴和Y轴
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(d3.timeMonth));
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
            svg.append("path")
                .datum(countryData)
                .attr("fill", "none")
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("d", lineConfirmed);

            svg.append("path")
                .datum(countryData)
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", lineDeaths);

            svg.append("path")
                .datum(countryData)
                .attr("fill", "none")
                .attr("stroke", "green")
                .attr("stroke-width", 2)
                .attr("d", lineRecovered);
        }

        // 绘制地图函数
        function renderMap(data) {
            const geoJsonUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

            // 创建SVG画布
            const svg = d3.select("#map").html("").append("svg")
                .attr("width", 900)
                .attr("height", 500);

            const projection = d3.geoNaturalEarth1().scale(150).translate([450, 250]);
            const path = d3.geoPath().projection(projection);

            d3.json(geoJsonUrl).then(world => {
                svg.append("g")
                    .selectAll("path")
                    .data(world.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", "#ccc")
                    .attr("stroke", "#333");

                // 显示数据（仅显示最新日期的数据）
                const latestDate = d3.max(data, d => d.Date);
                const latestData = data.filter(d => d.Date.getTime() === latestDate.getTime());
                const groupedData = d3.group(latestData, d => d["Country/Region"]);

                svg.selectAll("path")
                    .attr("fill", d => {
                        const countryData = groupedData.get(d.properties.name);
                        return countryData ? d3.interpolateReds(countryData[0].Confirmed / 1000000) : "#ccc";
                    })
                    .on("mouseover", (event, d) => {
                        const countryData = groupedData.get(d.properties.name);
                        if (countryData) {
                            const tooltip = d3.select("body").append("div")
                                .attr("class", "tooltip")
                                .style("position", "absolute")
                                .style("visibility", "visible")
                                .style("background", "rgba(0,0,0,0.7)")
                                .style("color", "#fff")
                                .style("padding", "10px")
                                .style("border-radius", "5px")
                                .style("font-size", "12px");

                            tooltip.html(`${d.properties.name}<br>Confirmed: ${countryData[0].Confirmed}<br>Deaths: ${countryData[0].Deaths}<br>Recovered: ${countryData[0].Recovered}`)
                                .style("top", (event.pageY + 10) + "px")
                                .style("left", (event.pageX + 10) + "px");
                        }
                    })
                    .on("mouseout", () => d3.select(".tooltip").remove());
            });
        }
    })
    .catch(function (error) {
        console.log(error);
    });
