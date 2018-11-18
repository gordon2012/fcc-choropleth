let data = {};

// Resizing variables
const maxW = 960;
const maxH = 615;

const maxPadding = { t: 30, r: 20, b: 90, l: 40 };
const minPadding = { t: 30, r: 20, b: 90, l: 40 };

const wrapPadding = 15;

let w = maxW;
let h = maxH;
let padding = maxPadding;

// Helper function to improve performance when resizing the window
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

// Draw and resize wrapped in debounce
var drawMap = debounce(function() {
  const title = document.getElementById('title');
  const titleStyle = getComputedStyle(title);
  const titleHeight =
    title.offsetHeight +
    parseInt(titleStyle.marginTop) +
    parseInt(titleStyle.marginBottom);

  if (window.innerWidth < maxW + maxPadding.t + maxPadding.b) {
    w = window.innerWidth - wrapPadding * 2;
    h = window.innerHeight - titleHeight - wrapPadding * 2;
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
  const svg = d3
    .select('.svg-target')
    .html('')
    .append('svg')
    .attr('class', 'card')
    .attr('width', w)
    .attr('height', h);

  // County colors
  const color = d3
    .scaleQuantize()
    .domain([
      d3.min(data.education.map(d => d.bachelorsOrHigher)),
      d3.max(data.education.map(d => d.bachelorsOrHigher))
    ])
    .range(d3.schemeBlues[9]);

  // Map
  const path = d3.geoPath();
  const education = new Map(
    data.education.map(d => [
      d.fips,
      {
        bachelorsOrHigher: d.bachelorsOrHigher,
        state: d.state,
        area_name: d.area_name
      }
    ])
  );

  svg
    .append('g')
    .selectAll('path')
    .data(
      topojson.feature(data.counties, data.counties.objects.counties).features
    )
    .enter()
    .append('path')
    .attr('class', 'county')
    .attr('data-fips', d => d.id)
    .attr('data-education', d => education.get(d.id).bachelorsOrHigher)
    .attr('data-area_name', d => education.get(d.id).area_name)
    .attr('data-state', d => education.get(d.id).state)
    .attr('fill', d => color(education.get(d.id).bachelorsOrHigher))
    .attr('d', path);

  // County borders
  svg
    .append('path')
    .datum(
      topojson.mesh(
        data.counties,
        data.counties.objects.counties,
        (a, b) => a !== b
      )
    )
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-linejoin', 'round')
    .attr('d', path);

  // State borders
  svg
    .append('path')
    .datum(topojson.mesh(data.counties, data.counties.objects.states))
    .attr('fill', 'none')
    .attr('stroke', 'grey')
    .attr('stroke-linejoin', 'round')
    .attr('d', path);

  // Legend
  const x = d3
    .scaleLinear()
    .domain(d3.extent(color.domain()))
    .rangeRound([600, 860]);

  const legend = svg
    .append('g')
    .attr('transform', 'translate(0,40)')
    .attr('id', 'legend');

  legend
    .selectAll('rect')
    .data(color.range().map(d => color.invertExtent(d)))
    .enter()
    .append('rect')
    .attr('height', 8)
    .attr('x', d => x(d[0]))
    .attr('width', d => x(d[1]) - x(d[0]))
    .attr('fill', d => color(d[0]));

  legend
    .append('text')
    .attr('class', 'caption')
    .attr('x', x.range()[0])
    .attr('y', -6)
    .attr('fill', '#000')
    .attr('text-anchor', 'start')
    .attr('font-weight', 'bold')
    .text('U.S. Education (%)');

  legend
    .call(
      d3
        .axisBottom(x)
        .tickSize(13)
        .tickFormat(d3.format('.1f'))
        .tickValues(
          color
            .range()
            .slice(1)
            .map(d => color.invertExtent(d)[0])
        )
    )
    .select('.domain')
    .remove();
};

(async () => {
  let counties = fetch('counties.json');
  let education = fetch('for_user_education.json');

  counties = await counties;
  data.counties = await counties.json();

  education = await education;
  data.education = await education.json();

  drawMap();
})();

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('resize', drawMap);

  // Tooltip
  document.querySelector('body').addEventListener('mouseover', event => {
    const el = event.target;

    if (el.classList.contains('county')) {
      const elr = el.getBoundingClientRect();
      const d = el.dataset;

      const tt = document.getElementById('tooltip');
      const ttr = tt.getBoundingClientRect();
      tt.style.opacity = 1;
      tt.style.left = `${elr.x - ttr.width / 2}px`;
      tt.style.top = `${elr.y - ttr.height - 10}px`;

      tt.dataset.education = d.education;
      tt.innerHTML = `
              <strong>${d.area_name}, ${d.state}</strong><br>
              <hr>
              ${d.education}%<br>
          `;
    }
  });
  document.querySelector('body').addEventListener('mouseout', event => {
    if (event.target.classList.contains('county')) {
      document.getElementById('tooltip').style.opacity = 0;
    }
  });
});
