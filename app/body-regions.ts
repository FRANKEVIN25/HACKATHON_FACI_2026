// Coordinates relative to an upright model of height 1, feet at y=0,
// anatomical front +z; anatomical right is -x when seen from the front.
// These are broad communication zones, never anatomical/diagnostic inference.
export function regionAtPoint({x,y,z}:{x:number;y:number;z:number}):string {
 if(y>=.865)return 'Cabeza';
 if(y>=.795&&Math.abs(x)<.075)return 'Garganta';
 if(Math.abs(x)>.115&&y>=.39&&y<.81)return 'Brazos';
 if(y<.455)return 'Piernas';
 if(z<-.015)return 'Espalda';
 if(y>=.665)return 'Pecho';
 if(y>=.565)return 'Abdomen alto';
 return x<0?'Abdomen bajo derecho':'Abdomen bajo izquierdo';
}
export const regionAnchors:Record<string,[number,number,number]>={
 'Cabeza':[0,.925,.055], 'Garganta':[0,.82,.055], 'Pecho':[0,.73,.075],
 'Abdomen alto':[0,.61,.065], 'Abdomen bajo derecho':[-.048,.515,.064],
 'Abdomen bajo izquierdo':[.048,.515,.064], 'Espalda':[0,.67,-.072],
 'Brazos':[-.245,.65,.01], 'Piernas':[-.10,.26,.025],
};
