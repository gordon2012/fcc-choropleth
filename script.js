let data = {};

// Resizing variables
const maxW = 2000;
const maxH = 1500;

const maxPadding = 75;
const minPadding = 75;
const wrapPadding = 15;

let w = maxW;
let h = maxH;
let padding = maxPadding;

// Helper function to improve performance when resizing the window
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if(!immediate) {
                func.apply(context, args);
            }
        }
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if(callNow) {
            func.apply(context, args);
        }
    };
};

// Draw and resize wrapped in debounce
var drawMap = debounce(function () {
    const title = document.getElementById('title');
    const titleStyle = getComputedStyle(title);
    const titleHeight = title.offsetHeight + parseInt(titleStyle.marginTop) + parseInt(titleStyle.marginBottom);

    if(window.innerWidth < maxW + 2 * maxPadding) {
        w = window.innerWidth - (wrapPadding * 2);
        h = window.innerHeight - titleHeight - (wrapPadding * 2);
        padding = minPadding;
    } else {
        w = maxW;
        h = maxH;
        padding = maxPadding;
    }
    renderMap();
}, 100);

// Render the Choropleth Map
const renderMap = () => {
    const svg = d3.select('.svg-target')
    .html('')
    .append('svg')
    .attr('class', 'card')
    .attr('width', w)
    .attr('height', h);

    // Title

    // x axis
    const xScale = d3.scaleLinear()
        .domain([0, 1])
        .range([padding, w - padding])
    const xAxis = d3.axisBottom(xScale)
        // .tickFormat(d3.format('d'));
    svg.append('g')
        .attr('transform', `translate(0, ${h - padding})`)
        .attr('id', 'x-axis')
        .call(xAxis);

    // y axis
    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([padding, h - padding]);
    const yAxis = d3.axisLeft(yScale);
    svg.append('g')
        .attr('transform', `translate(${padding}, 0)`)
        .attr('id', 'y-axis')
        .call(yAxis);

    // Color scale
    const colorScale = d3.scaleLinear()
        .domain([0,1])
        .range([0,1]);

    // Legend
    const legendScale = d3.scaleSequential(t => d3.interpolateRdYlBu(1-t))
        .domain([0,1]);
    svg.append('g')
        .attr('id', 'legend')
        .attr('transform', `translate(${padding}, ${h - padding + (padding / 3)})`);
    var legend = d3.legendColor()
        .cells(10)
        .shapePadding(0)
        .shapeWidth(((w-padding*2) / 10))
        .orient('horizontal')
        .scale(legendScale);
    svg.select('#legend')
        .call(legend);

    // Visualization
};

(async () => {
    let counties = fetch('counties.json');
    let education = fetch('for_user_education.json');

    counties = await counties;
    data.counties = await counties.json();

    education = await education;
    data.education = await education.json();

    console.log(data);
    drawMap();
})();

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', drawMap);
});
