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

        // 获取所有日期的列表，并去重排序
        const dates = [...new Set(data.map(d => d.Date))].sort(d3.ascending);

        // 创建时间筛选器
        const dateSelect = d3.select("#controls").append("select")
            .attr("id", "date-select")
            .style("margin-left", "10px");

        // 填充时间筛选器的选项
        dates.forEach(date => {
            dateSelect.append("option")
                .attr("value", date)
                .text(d3.timeFormat("%Y-%m-%d")(date));
        });

        // 默认选择第一个国家并展示数据
        const countries = [...new Set(data.map(d => d["Country/Region"]))];
        const selectedCountry = countries[0];
        renderChart(selectedCountry); // 默认展示曲线图
        renderMap(data, dates[0]); // 默认展示地图，时间为第一个日期

        // 当用户选择新的国家时更新曲线图
        d3.select("#country-select").on("change", function () {
            const selectedCountry = this.value;
            renderChart(selectedCountry);
        });

        // 当用户选择新的日期时更新地图
        dateSelect.on("change", function () {
            const selectedDate = d3.timeParse("%Y-%m-%d")(this.value);
            renderMap(data, selectedDate);
        });

        // 按钮选择器
        const showCurveBtn = d3.select("#show-curve");
        const showMapBtn = d3.select("#show-map");
        const chartContainer = d3.select("#chart-container");
        const mapContainer = d3.select("#map-container");

        // 切换视图逻辑
        showCurveBtn.on("click", () => {
            chartContainer.style("visibility", "visible").style("opacity", 1);
            mapContainer.style("visibility", "hidden").style("opacity", 0);
            const selectedCountry = d3.select("#country-select").property("value");
            renderChart(selectedCountry);
        });

        showMapBtn.on("click", () => {
            chartContainer.style("visibility", "hidden").style("opacity", 0);
            mapContainer.style("visibility", "visible").style("opacity", 1);
            const selectedDate = d3.timeParse("%Y-%m-%d")(d3.select("#date-select").property("value"));
            renderMap(data, selectedDate);
        });

        // 提前创建 Tooltip 容器
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "#fff")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("font-size", "12px");

        // 绘制曲线图函数
        function renderChart(country) {
            const countryData = data.filter(d => d["Country/Region"] === country);

            // 设置图表宽高
            const width = 900;
            const height = 500;
            const margin = { top: 20, right: 30, bottom: 50, left: 60 };

            // 清空图表并初始化
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

            // 添加坐标轴
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(d3.timeMonth));
            svg.append("g").call(d3.axisLeft(y));

            // 绘制折线
            const lines = [
                { key: "Confirmed", color: "blue" },
                { key: "Deaths", color: "red" },
                { key: "Recovered", color: "green" }
            ];

            lines.forEach(({ key, color }) => {
                const lineGenerator = d3.line()
                    .x(d => x(d.Date))
                    .y(d => y(d[key]));

                // 绘制折线
                svg.append("path")
                    .datum(countryData)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2)
                    .attr("d", lineGenerator);

                // 绘制悬停点
                svg.selectAll(`.dot-${key}`)
                    .data(countryData)
                    .enter()
                    .append("circle")
                    .attr("cx", d => x(d.Date))
                    .attr("cy", d => y(d[key]))
                    .attr("r", 4)
                    .attr("fill", color)
                    .on("mouseover", (event, d) => {
                        tooltip.style("visibility", "visible")
                            .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.Date)}<br>${key}: ${d[key]}`);
                    })
                    .on("mousemove", event => {
                        tooltip.style("top", `${event.pageY - 10}px`)
                            .style("left", `${event.pageX + 10}px`);
                    })
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            });
        }

        // 绘制地图函数
        function renderMap(data, selectedDate) {
            const geoJsonUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

            const svg = d3.select("#map").html("").append("svg")
                .attr("width", 900)
                .attr("height", 500);

            const projection = d3.geoNaturalEarth1().scale(150).translate([450, 250]);
            const path = d3.geoPath().projection(projection);

            d3.json(geoJsonUrl).then(world => {
                const dateFilteredData = data.filter(d => d.Date.getTime() === selectedDate.getTime());
                const groupedData = d3.group(dateFilteredData, d => d["Country/Region"]);

                svg.selectAll("path")
                    .data(world.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", "#ccc")
                    .attr("stroke", "#333")
                    .on("mouseover", (event, d) => {
                        const countryData = groupedData.get(d.properties.name);
                        if (countryData) {
                            tooltip.style("visibility", "visible")
                                .html(`${d.properties.name}<br>Confirmed: ${countryData[0].Confirmed}<br>Deaths: ${countryData[0].Deaths}<br>Recovered: ${countryData[0].Recovered}`);
                        }
                    })
                    .on("mousemove", event => {
                        tooltip.style("top", `${event.pageY - 10}px`)
                            .style("left", `${event.pageX + 10}px`);
                    })
                    .on("mouseout", () => {
                        tooltip.style("visibility", "hidden");
                    });
            });
        }
    })
    .catch(function (error) {
        console.log(error);
    });
