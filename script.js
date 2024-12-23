d3.csv("https://raw.githubusercontent.com/zzzmmmlll/covid-visualization/refs/heads/master/data/cleaned_covid_19_clean_complete.csv")
    .then(function (data) {
        // 数据处理：解析日期和数值
        data.forEach(d => {
            d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
            d.Confirmed = +d.Confirmed;
            d.Deaths = +d.Deaths;
            d.Recovered = +d.Recovered;
        });

        // 按国家聚合数据
        const aggregatedData = d3.groups(data, d => d["Country/Region"])
            .map(([key, values]) => ({
                country: key,
                data: d3.rollups(values,
                    v => ({
                        Date: v[0].Date, // 日期
                        Confirmed: d3.sum(v, d => d.Confirmed),
                        Deaths: d3.sum(v, d => d.Deaths),
                        Recovered: d3.sum(v, d => d.Recovered)
                    }),
                    d => d.Date)
            }));

        // 获取国家列表
        const countries = aggregatedData.map(d => d.country);

        // 动态填充选择框
        const countrySelect = d3.select("#country-select");
        countries.forEach(country => {
            countrySelect.append("option").attr("value", country).text(country);
        });

        let selectedCountry = countries[0];
        renderChart(selectedCountry);

        // 当用户选择新国家时更新图表
        countrySelect.on("change", function () {
            selectedCountry = this.value;
            renderChart(selectedCountry);
        });

        // 动态调整图表大小
        d3.select(window).on("resize", () => renderChart(selectedCountry));

        function renderChart(country) {
            const countryData = aggregatedData.find(d => d.country === country).data;

            // 动态获取宽度和高度
            const containerWidth = d3.select("#chart-container").node().getBoundingClientRect().width;
            const width = containerWidth * 0.9, height = width * 0.5; // 比例 16:9
            const margin = { top: 20, right: 50, bottom: 50, left: 80 };

            // 清空图表并初始化
            const svg = d3.select("#chart").html("").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // 设置比例尺
            const x = d3.scaleTime().domain(d3.extent(countryData, d => d[0])).range([0, width]);
            const y = d3.scaleLinear()
                .domain([0, d3.max(countryData, d => Math.max(d[1].Confirmed, d[1].Deaths, d[1].Recovered))])
                .range([height, 0]);

            // 添加坐标轴
            svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(d3.timeMonth));
            svg.append("g").call(d3.axisLeft(y));

            // 绘制折线
            const lineGenerator = key => d3.line()
                .x(d => x(d[0]))
                .y(d => y(d[1][key]))
                .curve(d3.curveMonotoneX);

            const lines = [
                { key: "Confirmed", color: "blue" },
                { key: "Deaths", color: "red" },
                { key: "Recovered", color: "green" }
            ];

            lines.forEach(({ key, color }) => {
                svg.append("path")
                    .datum(countryData)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2)
                    .attr("d", lineGenerator(key))
                    .attr("class", `line-${key}`);
            });

            // 限制图表范围，不超出边界
            svg.selectAll("path").attr("clip-path", "url(#clip)");

            // 添加裁剪区域
            svg.append("defs").append("clipPath")
                .attr("id", "clip")
                .append("rect")
                .attr("width", width)
                .attr("height", height);

            // 提示框
            const tooltip = d3.select("body").append("div").attr("class", "tooltip");
            svg.selectAll("circle")
                .data(countryData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d[0]))
                .attr("cy", d => y(d[1].Confirmed))
                .attr("r", 4)
                .attr("fill", "blue")
                .on("mouseover", (event, d) => {
                    tooltip.style("visibility", "visible")
                        .html(`Date: ${d3.timeFormat("%Y-%m-%d")(d[0])}<br>Confirmed: ${d[1].Confirmed}`);
                })
                .on("mousemove", event => {
                    tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
                })
                .on("mouseout", () => tooltip.style("visibility", "hidden"));

            // 图例移动到页面顶部
            const legend = d3.select("#legend-container").html("");
            lines.forEach(({ key, color }) => {
                const legendItem = legend.append("div").attr("class", "legend-item");
                legendItem.append("span").style("background-color", color);
                legendItem.append("span").text(key);
                legendItem.on("click", () => {
                    const line = svg.select(`.line-${key}`);
                    const isVisible = line.style("display") !== "none";
                    line.style("display", isVisible ? "none" : "block");
                });
            });
        }
    })
    .catch(console.error);
