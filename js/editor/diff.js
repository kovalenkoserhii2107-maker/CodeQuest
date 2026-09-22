/** Order-sensitive line diff. Bound memory for very large pasted drafts. */
export function lineDiff(before, after) {
  if (before === after) return [];
  const a=before.split('\n'), b=after.split('\n');
  if(a.length*b.length>400000) return [...a.map(line=>({sign:'−',line,kind:'out'})),...b.map(line=>({sign:'+',line,kind:'in'}))];
  const grid=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)grid[i][j]=a[i]===b[j]?1+grid[i+1][j+1]:Math.max(grid[i+1][j],grid[i][j+1]);
  const rows=[];let i=0,j=0;
  while(i<a.length||j<b.length){
    if(i<a.length&&j<b.length&&a[i]===b[j]){i++;j++;}
    else if(i<a.length&&(j===b.length||grid[i+1][j]>=grid[i][j+1]))rows.push({sign:'−',line:a[i++],kind:'out'});
    else rows.push({sign:'+',line:b[j++],kind:'in'});
  }
  return rows;
}
