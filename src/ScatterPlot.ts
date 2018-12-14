import * as d3 from "d3";
import { DataTuple, joinDataSets, years } from "./parseHelper";
import { BaseType } from "d3";
const csv_semicolon = d3.dsvFormat(';');
export class ScatterPlot {
    private readonly svg: d3.Selection<SVGGElement, {}, HTMLElement, any>;
    private readonly tooltip: d3.Selection<HTMLDivElement, {}, HTMLElement, any>;

    private  data: Map<String, DataTuple[]>;

    private readonly margin = { top: 20, right: 20, bottom: 30, left: 40 };
    private readonly width = 960 - this.margin.left - this.margin.right;
    private readonly height = 500 - this.margin.top - this.margin.bottom;
    private nextYear = years[0];

    /*
    * value accessor - returns the value to encode for a given data object.
    * scale - maps value to a visual display encoding, such as a pixel position.
    * map function - maps from data value to display value
    * axis - sets up axis
    */
    // setup x
    private readonly xValue = (d: DataTuple) => d.gini;
    private readonly xScale = d3.scaleLinear().range([0, this.width]);
    private readonly xMap = (d: DataTuple) => this.xScale(this.xValue(d));
    private readonly xAxis = d3.axisBottom(this.xScale);

    // setup y
    private readonly yValue = (d: DataTuple) => d.gdp;
    private readonly yScale = d3.scaleLinear().range([this.height, 0]);
    private readonly yMap = (d: DataTuple) => this.yScale(this.yValue(d));
    private readonly yAxis = d3.axisLeft(this.yScale);

    // setup fill color
    private readonly cValue = (d: DataTuple) => 'Europe';
    private readonly color = d3.scaleOrdinal(d3.schemeCategory10);

    constructor(container: d3.Selection<d3.BaseType, {}, HTMLElement, any>) {
         // add the graph canvas to the body of the webpage
         this.svg = container.append("svg")
         .attr("width", this.width + this.margin.left + this.margin.right)
         .attr("height", this.height + this.margin.top + this.margin.bottom)
         .append("g")
         .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
 
        // add the tooltip area to the webpage
        this.tooltip = container.append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    async create () : Promise<ScatterPlot> {
        this.data = joinDataSets(
            csv_semicolon.parse(await d3.text("data/gdp.csv")),
            csv_semicolon.parse(await d3.text("data/gini.csv")));
    
        let xMax = Number.NEGATIVE_INFINITY, xMin = Number.POSITIVE_INFINITY;
        let yMax = Number.NEGATIVE_INFINITY, yMin = Number.POSITIVE_INFINITY;
        this.data.forEach(year => year.forEach(country => {
            if(!Number.isFinite(this.xValue(country)) || !Number.isFinite(this.yValue(country)))
                return;
                
            xMax = Math.max(xMax, this.xValue(country));
            xMin = Math.min(xMin, this.xValue(country));
            yMax = Math.max(yMax, this.yValue(country));
            yMin = Math.min(yMin, this.yValue(country));
        }));
    
        // don't want dots overlapping axis, so add in buffer to data domain
        this.xScale.domain([xMin * 0.9, xMax * 1.1]);
        this.yScale.domain([yMin * 0.9, yMax * 1.1]);
    
        // x-axis
        this.svg
            .append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + this.height + ")")
            .call(this.xAxis)
            .append("text")
            .attr("class", "label")
            .attr("x", this.width)
            .attr("y", -6)
            .style("text-anchor", "end")
            .text("Calories");
    
        // y-axis
        this.svg
            .append("g")
            .attr("class", "y axis")
            .call(this.yAxis)
            .append("text")
            .attr("class", "label")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Protein (g)");
    
        this.animateScatterPlot();

        // draw legend
        var legend = this.svg.selectAll(".legend")
            .data(this.color.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });
    
        // draw legend colored rectangles
        legend.append("rect")
            .attr("x", this.width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", this.color);
    
        // draw legend text
        legend.append("text")
            .attr("x", this.width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function (d: any) { return d; });
        return this;
    }
    
    public animateScatterPlot(year?: string) {
        if(year !== undefined)
            this.nextYear = year;

        this.updateScatterPlot(this.data.get(this.nextYear));
        console.log('Updating graph for ' + this.nextYear)

        let nextIndex = (years.indexOf(this.nextYear) + 1) % years.length;
        this.nextYear = years[nextIndex];
    }

    private updateScatterPlot(data: DataTuple[]) {
        const graph = this.svg.selectAll(".dot")
            .data(data);
        // Update 
        this.updateDots(graph);

        //Enter
        this.updateDots(graph.enter().append('circle'), true);
    
        graph.exit().remove();
    }

    private updateDots(selection: d3.Selection<SVGCircleElement | BaseType, DataTuple, SVGGElement, {}>, isNew = false) {
        selection
            .attr("cx", this.xMap)
            .attr("cy", this.yMap)
        if(isNew) {
            selection
                .attr("class", "dot")
                .attr("r", 3.5)
                .style("fill", d => this.color(this.cValue(d)))
                .on("mouseover", d => {
                    this.tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    this.tooltip.html(d.country + "<br/> (" + this.xValue(d)
                        + ", " + this.yValue(d) + ")")
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    this.tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }
    }
}
