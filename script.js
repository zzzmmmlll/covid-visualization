// 使用 D3.js 从 GitHub 仓库加载数据
d3.csv("https://zzzmmmlll.github.io//covid-visualization/main/data/cleaned_covid_19_clean_complete.csv")
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

        // 绘制图表的函数
        function renderChart(data, country) {
            // 筛选出选择国家的数据
            const countryData = data.filter(d => d["Country/Region"] === country);

            // 设置图表的尺寸
            const width = 900, height = 500;
            const margin = { top: 20, right: 30, bottom: 50, left: 60 };
            const svg = d3.select("#chart").html("").append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // 设置X轴和Y轴的比例尺
            const x = d3.scaleTime()
                .domain(d3.extent(countryData, d => d.Date))
                .range([0, width - margin.left - margin.right]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(countryData, d => Math.max(d.Confirmed, d.Deaths, d.Recovered))])
                .range([height - margin.top - margin.bottom, 0]);

            // 绘制X轴
            svg.append("g")
                .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
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

            svg.append("path")
                .data([countryData])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "blue")
                .attr("stroke-width", 2)
                .attr("d", lineConfirmed);

            svg.append("path")
                .data([countryData])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", lineDeaths);

            svg.append("path")
                .data([countryData])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "green")
                .attr("stroke-width", 2)
                .attr("d", lineRecovered);

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
        }
    })
    .catch(function (error) {
        console.log(error);
    });
