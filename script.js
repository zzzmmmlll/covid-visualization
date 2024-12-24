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
        renderCurve(data, selectedCountry);

        // 当用户选择新的国家时更新图表
        countrySelect.on("change", function () {
            const selectedCountry = this.value;
            renderCurve(data, selectedCountry); // 切换国家时更新曲线图
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

            // 渲染地图（切换到地图视图时触发）
            renderMap(data);
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

            // 添加鼠标悬停点
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background", "rgba(0,0,0,0.6)")
                .style("color", "#fff")
                .style("border-radius", "5px")
                .style("padding", "10px")
                .style("font-size", "12px");

            svg.selectAll(".dot")
                .data(countryData)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.Date))
                .attr("cy", d => y(d.Confirmed))
                .attr("r", 5)
                .attr("fill", "blue")
                .on("mouseover", (event, d) => {
                    tooltip.style("visibility", "visible")
                        .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d.Date)}<br>Confirmed: ${d.Confirmed}`);
                })
                .on("mousemove", event => {
                    tooltip.style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"));
        }

        // 封装地图渲染函数
        function renderMap(data) {
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
                const nestedData = d3.group(data, d => d["Country/Region"]);
                const latestDate = d3.max(data, d => d.Date);

                svg.append("g")
                    .selectAll("path")
                    .data(geoData.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", d => {
                        const countryData = nestedData.get(d.properties.name);
                        if (countryData) {
                            const confirmed = countryData.find(c => c.Date.getTime() === latestDate.getTime())?.Confirmed || 0;
                            return d3.interpolateReds(confirmed / 100000);
                        }
                        return "#ccc";
                    })
                    .attr("stroke", "#333")
                    .on("mouseover", (event, d) => {
                        const countryData = nestedData.get(d.properties.name);
                        if (countryData) {
                            const latest = countryData.find(c => c.Date.getTime() === latestDate.getTime());
                            d3.select("body").append("div")
                                .attr("class", "tooltip")
                                .html(`${d.properties.name}<br>Confirmed: ${latest?.Confirmed || 0}<br>Deaths: ${latest?.Deaths || 0}<br>Recovered: ${latest?.Recovered || 0}`);
                        }
                    })
                    .on("mouseout", () => d3.select(".tooltip").remove());
            });
        }
    })
    .catch(function (error) {
        console.error("Error loading the data:", error);
    });
