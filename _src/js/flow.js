var margin = {top: 20, right: 1, bottom: 6, left: 1},
    width = 1140 - margin.left - margin.right,
    height = 630 - margin.top - margin.bottom;

var formatNumber = d3.format(",.0f"),
    format = function(d) { return "$" + formatNumber(d); },
    color = d3.scale.category10();

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

svg.append("text")
    .text("Revenues")
    .attr("y", margin.top * 0.6)
    .attr("x", margin.left);

svg.append("text")
    .text("Expenses")
    .attr("y", margin.top * 0.6)
    .attr("x", margin.left + width)
    .attr("text-anchor", "end");

// define color scales
var fundColors = d3.scale.ordinal()
    .domain(["General Fund", "Other Funds"])
    .range(["#276419", "#4db029"]);
    // .range(["#276419", "#b8e186"]);
var erColors = d3.scale.ordinal()
    .domain(["expense", "revenue"])
    .range(["#ffd92f", "#ffd92f"])
    // .range(["#c51b7d", "#8e0152"]);

// create color gradients for links
svg.append('linearGradient')
    .attr("id", "gradientRtoGF")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", '100%').attr("y2", 0)
    .selectAll("stop")
    .data([
        {offset: "10%", color: erColors("revenue")},
        {offset: "90%", color: fundColors("General Fund")}
    ])
    .enter().append("stop")
    .attr("offset", function(d) { return d.offset; })
    .attr("stop-color", function(d) { return d.color; });
svg.append('linearGradient')
    .attr("id", "gradientRtoNF")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", '100%').attr("y2", 0)
    .selectAll("stop")
    .data([
        {offset: "10%", color: erColors("revenue")},
        {offset: "90%", color: fundColors("Other Funds")}
    ])
    .enter().append("stop")
    .attr("offset", function(d) { return d.offset; })
    .attr("stop-color", function(d) { return d.color; });
svg.append('linearGradient')
    .attr("id", "gradientNFtoE")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", '100%').attr("y2", 0)
    .selectAll("stop")
    .data([
        {offset: "10%", color: fundColors("Other Funds")},
        {offset: "90%", color: erColors("expense")}
    ])
    .enter().append("stop")
    .attr("offset", function(d) { return d.offset; })
    .attr("stop-color", function(d) { return d.color; });
svg.append('linearGradient')
    .attr("id", "gradientGFtoE")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", '100%').attr("y2", 0)
    .selectAll("stop")
    .data([
        {offset: "10%", color: fundColors("General Fund")},
        {offset: "90%", color: erColors("expense")}
    ])
    .enter().append("stop")
    .attr("offset", function(d) { return d.offset; })
    .attr("stop-color", function(d) { return d.color; });

// wrangle the data
function data_wrangle(dataset, fy){
    var newdata = dataset.filter(function(v){
        return v.budget_year == fy
    })
    rev_order = [
      // keep variations of the same label on a single line
      "Taxes and levies",
      "Licenses",
      "Fees",
      "Intergovernmental",
      "Rental income",
      "Charges for services and sales",
      "Other revenue",
      "Non-operating revenue",
    ];
    rev = newdata.filter(function(v,i,a){
        return v.account_type == "Revenue";
    });
    revcats = d3.nest()
        .key(function(d){
            return d.account_category;
        })
        .sortKeys(function(a,b){
            return rev_order.indexOf(a) - rev_order.indexOf(b);
        })
        .key(function(d){
            if (d.fund_type == "100" || d.fund_type == "236") {
                return "General Fund";
            } else {
                return "Other Funds";
            }
        })
        .rollup(function(v){
            var values = v;
            values.total = d3.sum(values, function(d){
                return +d.amount;
            });
            return values;
        })
        .entries(rev);
    nodes = [{"name": "General Fund", "type": "fund", "order": 0}, {"name": "Other Funds", "type": "fund", "order": 1}];
    nodeoffset = nodes.length;
    links = [];
    for (var i = 0; i < revcats.length; i++){
        nodes.push({"name": revcats[i].key, "type": "revenue"});
        for (var x = 0; x < revcats[i].values.length; x++) {
            var link = {
                "source": i + nodeoffset,
                "value": revcats[i].values[x].values.total,
            };
            if (revcats[i].values[x].key == "General Fund"){
                link.target = 0;
            } else if (revcats[i].values[x].key == "Other Funds") {
                link.target = 1;
            }
            links.push(link);
        }

    }
    exp = newdata.filter(function(v,i,a){
        return v.account_type == "Expense";
    });
    exp_order = [
        // keep variations of the same label on a single line
        "Park",
        "Police Department",
        "Fire Department",
        "City Council",
        "Public Works & Utilities",
        "Information Tech/Info Services",
        "Airport",
        "Non Departmental",
        "Department of Finance"
    ];
    expdivs = d3.nest()
        .key(function(d){
            if (d.department == "Non-Departmental") {
                return "Debt Service & Misc."
            }
            return d.department;
        })
        .sortKeys(function(a,b){
            return exp_order.indexOf(a) - exp_order.indexOf(b);
        })
        .key(function(d){
            if (d.fund_type == "100" || d.fund_type == "236") {
                return "General Fund";
            } else {
                return "Other Funds";
            }
        })
        .rollup(function(v){
            var values = v;
            values.total = d3.sum(values, function(d){
                return d.amount;
            });
            return values;
        })
        .entries(exp);
    for (var i = 0; i < expdivs.length; i++){
        nodes.push({"name": expdivs[i].key, "type": "expense"});
        for (var x = 0; x < expdivs[i].values.length; x++) {
            var link = {
                "target": i + nodeoffset + revcats.length,
                "value": expdivs[i].values[x].values.total,
            };
            if (expdivs[i].values[x].key == "General Fund"){
                link.source = 0;
            } else if (expdivs[i].values[x].key == "Other Funds") {
                link.source = 1;
            }
            links.push(link);
        }
    }

    return {"nodes": nodes, "links": links};
}

// render the sankey
function do_with_budget(data) {

  svg.select("#chart").remove();

  var chart = svg.append("g")
      .attr("id", "chart")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .size([width, height]);

  var path = sankey.link();

  sankey
      .nodes(data.nodes)
      .links(data.links)
      .layout(0);

  var link = chart.append("g")
    .selectAll(".link")
      .data(data.links)
    .enter().append("path")
      .attr("class", "link")
      .attr("d", path)
      .style("stroke-width", function(d) {
          return Math.max(1, d.dy); })
      .style("stroke", function(d){
          switch (d.target.name){
              case "General Fund":
                  return "url('#gradientRtoGF')";
              case "Other Funds":
                  return "url('#gradientRtoNF')";
          }
          switch (d.source.name) {
              case "General Fund":
                  return "url('#gradientGFtoE')";
              case "Other Funds":
                  return "url('#gradientNFtoE')";
          }

      })
      .sort(function(a, b) {
          return b.dy - a.dy;
          })
      .on("mouseover", function(d){
        d3.select(this).classed("highlight", true);
        d3.select("#hover_description")
            .classed("show", true)
            .text(d.source.name + " → " + d.target.name + ": " + format(d.value));
      })
      .on("mousemove", function(d){
          d3.select("#hover_description")
            .style({
                    "top": (d3.event.y - 10 + $(window).scrollTop()) + "px",
                    "left": (d3.event.x + 10) + "px"
                    });
      })
      .on("mouseout", function(){
        d3.select(this).classed("highlight", function(){
            return d3.select(this).classed('click');
        })
        d3.select("#hover_description")
            .classed("show", false);
      });

  var node = chart.append("g").selectAll(".node")
      .data(data.nodes)
    .enter().append("g")
      .attr("class", function(d){ return "node " + d.type; })
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });


  node.append("rect")
      .attr("height", function(d) { return d.dy; })
      .attr("width", sankey.nodeWidth())
      .style("fill", function(d) {
          switch (d.type) {
              case "fund":
                  d.color = fundColors(d.name);
                  break;
              default:
                  d.color = erColors(d.type);
                  break;
          }
          return d.color;
      })
      .style("stroke", function(d) { return d3.rgb(d.color).darker(1); })
      .on("mouseover", function(d){
          var thisnode = d3.select(this.parentNode);

        //   highlight node only, not flows
          thisnode.classed("hover", true);

        //   append total amount to label
          thisnode.select("text").transition()
            .text(function(d){
                var text = d.name;
                text += ': ' + format(d.value);
                return text;
            });
      })
      .on("mouseout", function(d){
          var thisnode = d3.select(this.parentNode);
        //   remove node highlight
          thisnode.classed("hover", false);
        //   remove amount from label
        if (!thisnode.classed('highlight')) {
            thisnode.select("text").transition()
              .text(function(d){ return d.name; });
        }

      })
      .on("click", function(d){
          var thisnode = d3.select(this.parentNode);
          if (thisnode.classed("highlight")) {
              thisnode.classed("highlight", false);
              thisnode.classed("hover", false);
          } else {
            //   node.classed("highlight", false);
              thisnode.classed("highlight", true);
          }

          link.classed('highlight click', function(link_d){
              if ([link_d.target.name, link_d.source.name].indexOf(d.name) >= 0) {
                  return thisnode.classed("highlight");
              } else {
                  return d3.select(this).classed("click");
              }
          });

          thisnode.select("text").transition()
            .text(function(d){
                var text = d.name;
                if (thisnode.classed('highlight')) {
                    text += ': ' + format(d.value);
                }
                return text;
            });
      });

  node.append("text")
      .attr("x", -6)
      .attr("y", function(d) { return d.dy / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .attr("transform", null)
      .text(function(d) { return d.name; })
    .filter(function(d) { return d.x < width / 2; })
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");
};
