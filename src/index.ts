import "bootstrap";
import { event } from "d3";
import { select } from "d3-selection";
import { DataSource, ICountry, StatValue, years } from "./DataSource";
import { LineChart } from "./LineChart";
import { ScatterPlot } from "./ScatterPlot";

let plot: ScatterPlot;
let chart1: LineChart;
let anim: NodeJS.Timeout;
DataSource.loadData().then((data) => {
    plot = new ScatterPlot(select("#plot"), data);
    plot.subscribeOnSelectionChanged((country) => {
        if (country.length !== 0) {
            const selectedCountries = new Map(
                country.map<[ICountry, Map<StatValue, Array<{year: string, value: number}>>]>(
                    (c) => [c, data.getCountryStats(c)]));
            if (chart1) {
                chart1.setCountries(selectedCountries);
            } else {
                chart1 = new LineChart(select("#chart1"), selectedCountries);
                select("#reset-selection")
                    .classed("d-none", false)
                    .on("click", () => {
                        plot.setSelection([]);
                    });
            }
        }
    });

    // Create a chart each frame to not lag on load
    const createChart = (queue: ICountry[]) => {
        const country = queue.shift();
        const chart = new LineChart(
            select("#charts"),
            new Map([[country, data.getCountryStats(country)]]));
        if (queue.length > 0) {
            setTimeout(() => createChart(queue), 0);
        }
    };
    createChart(data.getCountries());
}).catch((err) => console.error(err));

select("#showChile").on("click", () => {
   plot.setSelectionByName(["Chile"]);
});
select("#showAfricola").on("click", () => {
    plot.setSelectionByName(["Central African Republic"]);
 });
select("#showBulgaria").on("click", () => {
    plot.setSelectionByName(["Bulgaria"]);
 });
select("#showAngola").on("click", () => {
    plot.setSelectionByName(["Angola"]);
 });

select("#animation-control").on("click", () => {
    const isRunning = anim !== undefined;
    const animation = () => {
        const nextIndex = (years.indexOf(plot.getDisplayedYear()) + 1) % years.length;
        plot.animateScatterPlot(years[nextIndex]);
    };

    let text: string;
    if (isRunning) {
        clearInterval(anim);
        anim = undefined;
        text = "Start Animation";
    } else {
        animation();
        anim = setInterval(animation, 2000);
        text = "Stop Animation";
    }

    event.target.textContent = text;
});
