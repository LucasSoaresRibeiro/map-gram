/*
 * InstagramToArcGISGraphic
 *
 * @version 1.0.0
 *
 * @author Lucas Ribeiro <ribeiro.lucas.soares@gmail.com>
 *
 * Powered by InstagramFeed
 *
 */

var InstagramToArcGISGraphic = (function(){

    return function(opts){

        this.options = Object.assign({}, opts);

        this.get = function(callback){
            var _this = this;
            new InstagramFeed({
                'username': this.options.username,
                'get_data': true,
                'callback': function(data){

                    let profile = {
                       "full_name": data.full_name,
                       "username": data.username,
                       "profile_pic_url": data.profile_pic_url,
                       "profile_pic_url_hd": data.profile_pic_url_hd,
                       "biography": data.biography,
                       "followed_by": data.edge_followed_by.count,
                       "follow": data.edge_follow.count,
                    }
                
                    let points = [];
                    let photos = data.edge_owner_to_timeline_media.edges;
                    photos.forEach(photo => {
                        if(photo.node.location) {
                            points.push({
                                "geometry": {
                                    type: "point",
                                    longitude: 0,
                                    latitude: 0
                                },
                                "attributes": {
                                    "imageUrl": photo.node.display_url,
                                    "content": photo.node.edge_media_to_caption.edges[0].node.text,
                                    "likes": photo.node.edge_liked_by.count,
                                    "comments": photo.node.edge_media_to_comment.count,
                                    "location": photo.node.location.name,
                                    "location_id": photo.node.location.id
                                }
                            })
                        }
                    });

                    let instagramData = {
                        "profile": profile,
                        "points": points
                    }

                    callback(instagramData, _this);
                }
            });
        };
        
        this.addLocation = function(callback, instagramData){
            
            var _this = this;
            var promises = [];

            instagramData.points.forEach(point => {
                var currentPromise = new Promise(function(resolve, reject) {
                    let url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${point.attributes.location}&f=json&maxLocations=1`
                    var xhr = new XMLHttpRequest();
                    xhr.onload = function(e){
                        if(xhr.readyState === 4){
                            if (xhr.status === 200) {
                                let result = JSON.parse(xhr.responseText);
                                if (result.candidates.length > 0) {
                                    let location = result.candidates[0].location;
                                    point.geometry.longitude = location.x;
                                    point.geometry.latitude = location.y;
                                }
                                resolve(point);

                            } else {
                                console.error("InstagramToArcGISGraphic: Geocode request error. Response: " + xhr.statusText);
                                reject();
                            }
                        }
                    };
                    xhr.open("GET", url, true);
                    xhr.send();
                });
                promises.push(currentPromise);
            });

            Promise.all(promises).then(function(values) {
                callback(instagramData, _this);
            });
        };

        this.run = function(){
            this.get(function(data, instance){
                instance.addLocation(function(data, instance){
                    instance.options.callback(data, instance);
                }, data)
            });
        };

        this.run();
    };
})();
