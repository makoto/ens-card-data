require "erb"
require('csv')
csv = CSV.open('./bquxjob_56be86f2_183e85a52e1.csv').readlines

# Create template.
template = %q{
  WITH poap AS (
  SELECT *
  FROM (
  VALUES
  <%# ignore numerous minor requests -- focus on priorities %>
  % csv[1..-1].each_with_index do |c, i|
  %  id, poapId, name, address,createdAt,approvedAt,printedAt = c
  %  label = (name.match(/\.eth/) && name.split(".").length == 2) ?  "\'#{name.split(".").first}\'" : 'null'
  %  if poapId 
      (<%= poapId %>,'<%= createdAt %>','<%= address.downcase %>','<%= name %>', <%= label %> ,'<%= printedAt %>')<%= (i != csv.length - 2) ? ',' : '' %>
  %  end
  % end
  ) AS x (poap_id, created_at, address, name, label, printed_at)
  )
  select * from poap;
}.gsub(/^  /, '')

message = ERB.new(template, 0, "%<>")

# Produce result.
email = message.result
puts email
