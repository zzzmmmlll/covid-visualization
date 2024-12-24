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

        // 获取所有日期并排序
        const dates = [...new Set(data.map(d => d.Date))].sort(d3.ascending);

        // 在页面中添加时间选择器
        const timeSelect = d3.select("#time-select");
        dates.forEach(date => {
            timeSelect.append("option")
                .attr("value", date)
                .text(d3.timeFormat("%Y-%m-%d")(date));
        });

        // 默认选择最后一个日期（最新数据）
        const defaultDate = dates[dates.length - 1];
        timeSelect.property("value", defaultDate);

        // 初始化地图和曲线图
        renderCurve(data, "Afghanistan"); // 默认国家
        renderMap(data, defaultDate); // 默认显示最新时间的地图

        // 当时间选择器改变时更新地图
        timeSelect.on("change", function () {
            const selectedDate = d3.timeParse("%Y-%m-%d")(this.value);
            renderMap(data, selectedDate);
        });

        // 封装曲线图渲染函数
        function renderCurve(data, country) {
            // 筛选出选择国家的数据
            const countryData = data.filter(d => d["Country/Region"] === country);

            // 设置图表的尺寸
            const width = 900, height = 500;
            const margin = { top: 30, right: 30, bottom: 30, left: 50 };

            // 清空图表容器并创建SVG
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
                .call(d3.axisBottom(x));
            svg.append("g")
                .call(d3.axisLeft(y));

            // 绘制折线
            const lines = [
                { label: "Confirmed", color: "blue", accessor: d => d.Confirmed },
                { label: "Deaths", color: "red", accessor: d => d.Deaths },
                { label: "Recovered", color: "green", accessor: d => d.Recovered },
            ];

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background", "rgba(0,0,0,0.6)")
                .style("color", "#fff")
                .style("border-radius", "5px")
                .style("padding", "10px")
                .style("font-size", "12px");

            lines.forEach(line => {
                const lineGenerator = d3.line()
                    .x(d => x(d.Date))
                    .y(d => y(line.accessor(d)));

                svg.append("path")
                    .datum(countryData)
                    .attr("fill", "none")
                    .attr("stroke", line.color)
                    .attr("stroke-width", 2)
                    .attr("d", lineGenerator);

                // 添加悬停点
                svg.selectAll(`.dot-${line.label}`)
                    .data(countryData)
                    .enter().append("circle")
                    .attr("class", `dot-${line.label}`)
                    .attr("cx", d => x(d.Date))
                    .attr("cy", d => y(line.accessor(d)))
                    .attr("r", 5)
                    .attr("fill", line.color)
                    .on("mouseover", (event, d) => {
                        tooltip.style("visibility", "visible")
                            .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.Date)}<br>${line.label}: ${line.accessor(d)}`);
                    })
                    .on("mousemove", event => {
                        tooltip.style("top", (event.pageY - 10) + "px")
                            .style("left", (event.pageX + 10) + "px");
                    })
                    .on("mouseout", () => tooltip.style("visibility", "hidden"));
            });
        }

        // 封装地图渲染函数
        function renderMap(data, selectedDate) {
            const geoJsonUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

            const svg = d3.select("#map").html("").append("svg")
                .attr("width", 900)
                .attr("height", 500);

            const projection = d3.geoNaturalEarth1()
                .scale(150)
                .translate([450, 250]);

            const path = d3.geoPath().projection(projection);

            // 加载地理数据
            d3.json(geoJsonUrl).then(geoData => {
                const nestedData = d3.group(data.filter(d => d.Date.getTime() === selectedDate.getTime()), d => d["Country/Region"]);

                svg.append("g")
                    .selectAll("path")
                    .data(geoData.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", d => {
                        const countryData = nestedData.get(d.properties.name);
                        if (countryData) {
                            const confirmed = countryData[0]?.Confirmed || 0;
                            return d3.interpolateReds(confirmed / 100000); // 根据确诊人数设置颜色深浅
                        }
                        return "#ccc";
                    })
                    .attr("stroke", "#333")
                    .on("mouseover", (event, d) => {
                        const countryData = nestedData.get(d.properties.name);
                        if (countryData) {
                            const data = countryData[0];
                            d3.select(".tooltip")
                                .style("visibility", "visible")
                                .html(`${d.properties.name}<br>Confirmed: ${data.Confirmed}<br>Deaths: ${data.Deaths}<br>Recovered: ${data.Recovered}`);
                        }
                        d3.select(event.target).attr("stroke", "yellow").attr("stroke-width", 2); // 高亮
                    })
                    .on("mousemove", event => {
                        d3.select(".tooltip")
                            .style("top", (event.pageY - 10) + "px")
                            .style("left", (event.pageX + 10) + "px");
                    })
                    .on("mouseout", (event, d) => {
                        d3.select(".tooltip").style("visibility", "hidden");
                        d3.select(event.target).attr("stroke", "#333").attr("stroke-width", 1); // 恢复原样
                    });
            });
        }
    })
    .catch(function (error) {
        console.error("Error loading the data:", error);
    });
