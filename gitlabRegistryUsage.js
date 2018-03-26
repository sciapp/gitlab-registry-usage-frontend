{
    // Replace the following URLs
    //---------------------------------------------------------------------------------------------
    const SERVER_URL = `https://exampleserver/gitlab-registry-usage-rest/images?embed=true`;
    const LOGIN_URL = `https://exampleserver/gitlab-registry-usage-rest/auth_token`;
    //---------------------------------------------------------------------------------------------
    
    const COOKIE_LIFETIME = 1000 * 60 * 60 * 24 * 14;   //Cookie lifetime (14 days)


    class GitlabRegistryUsage {
        constructor() {
            this.div = $(`#gitlabRegistryUsage`);
            this.viewDiv = $(`#gitlabRegistryUsageView`);
            this.kibis = true;
            this.descending = true;
            this.barTextStyle = {textAlign: `center`, width: `100%`, position: `absolute`, display: `block`, pointerEvents: `none`};
            this.progressStyle = {position: `relative`, height: `20px`, marginBottom: `2px`};
            this.and = true;
            this.checkLoginState();
            
            let unitButton = $(`#unitButton`);
            let viewButtons = [$(`#gitlabRegistryUsageImageSizeButton`), $(`#gitlabRegistryUsageSizeButton`), $(`#gitlabRegistryUsageNameButton`)];
            unitButton.click(() => {
                this.kibis = !this.kibis;
                if (this.kibis) {
                    unitButton.text(`KiB`);
                } else {
                    unitButton.text(`KB`);
                }
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            let toggleButtonMenu = (active) => {
                for (let i in viewButtons) {
                    viewButtons[i].addClass(i == active ? `btn-primary` : `btn-outline-primary`);
                    viewButtons[i].removeClass(i == active ? `btn-outline-primary` : `btn-primary`);
                }
            };
            
            viewButtons[0].click(() => {
                toggleButtonMenu(0);
                this.refreshView = (search=[]) => { this.imageview(this.data, this.imageSorted, this.tagsSorted, this.max, this.imagesum, this.maximage, search); };
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            viewButtons[1].click(() => {
                toggleButtonMenu(1);
                this.refreshView = (search=[]) => { this.tagview(this.data, this.sorted, this.max, search); };
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            viewButtons[2].click(() => {
                toggleButtonMenu(2);
                this.refreshView = (search=[]) => { this.imageview(this.data, this.imageSortedAlpha, this.tagsSortedAlpha, this.max, this.imagesum, this.maximage, search); };
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#orderButton`).click(() => {
                this.descending = !this.descending;
                if (this.descending) {
                    $(`#orderButton`).html(`Descending <i class="fas fa-angle-down"></i>`);
                } else {
                    $(`#orderButton`).html(`Ascending <i class="fas fa-angle-up"></i>`);
                }
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#gitlabRegistryUsageSearchButton`).click(() => {
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#gitlabRegistryUsageSearchInput`).on(`input`, () => {
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#relationAnd`).click(() => {
                this.and = true;
                $(`#relationDropdown`).text(`AND`);
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#relationOr`).click(() => {
                this.and = false;
                $(`#relationDropdown`).text(`OR`);
                this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
            });
            
            $(`#gitlabRegistryUsageLogoutButton`).click(() => {
                this.logout();
            });
        }
        
        logout() {
            let now = new Date();
            let expTime = new Date(now.getTime() - 6000);
            document.cookie = `gitlabRegistryUsage_token= ; expires=${expTime.toGMTString()}`;
            location.reload();
        }
        
        checkLoginState() {
            let token;
            if (document.cookie && document.cookie.indexOf(`gitlabRegistryUsage_token=`) > -1) {
                let start = document.cookie.indexOf(`gitlabRegistryUsage_token=`) + 26;
                let end = document.cookie.indexOf(`;`, start);
                if (end == -1) {
                    end = document.cookie.length;
                }
                token = document.cookie.substring(start, end);
            }
            if (typeof token === `undefined`) {
                this.viewDiv.html($(`<div class="mt-3">Please login to view the registry's diskspace usage.</div>
                    <form class="mt-3" id="gitlabRegistryUsageLoginForm">
                    <div class="form-group">
                        <label for="gitlabRegistryUsageNameInput">Username</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="gitlabRegistryUsageNameInput" placeholder="Enter username">
                            <div class="input-group-append">
                                <span class="input-group-text"><i class="fas fa-user"></i></span>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="gitlabRegistryUsagePasswordInput">Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="gitlabRegistryUsagePasswordInput" placeholder="Password">
                            <div class="input-group-append">
                                <span class="input-group-text"><i class="fas fa-key"></i></span>
                            </div>
                        </div>
                    </div>
                    <button type="submit" id="gitlabRegistryUsageLoginButton" class="btn btn-primary">Login</button>
                </form>
                <div id="gitlabRegistryUsage">
                </div>`));
                $(`#gitlabRegistryUsageLoginForm`).submit((e) => {
                    this.login();
                    e.preventDefault();
                });
            } else {
                this.requestData(token);
            }        
        }
        
        login() {
            let username = $(`#gitlabRegistryUsageNameInput`).val();
            let password = $(`#gitlabRegistryUsagePasswordInput`).val();
            if (username == `` || password == ``) {
                $(`#gitlabRegistryUsage`).html($(`<div class="alert alert-danger">
                        <strong>Login failed.</strong> Please insert username and password.<br />
                    </div>`));
                return;
            }
            $.ajax({
                url: LOGIN_URL,
                method: `GET`,
                dataType: `json`,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader(`Authorization`, `Basic ${btoa(`${username}:${password}`)}`);
                },
                error: (answer) => {
                    if (answer.status == 401) {
                        $(`#gitlabRegistryUsage`).html($(`<div class="alert alert-danger">
                                <strong>Login failed.</strong> Wrong username and password combination. Please try again.
                            </div>`));
                    } else {
                        $(`#gitlabRegistryUsage`).html($(`<div class="alert alert-danger">
                                <strong>Login failed.</strong> Please try again later.<br />
                            </div>`));
                    }
                },
                success: (token) => {
                    let now = new Date();
                    let expTime = new Date(now.getTime() + COOKIE_LIFETIME);
                    document.cookie = `gitlabRegistryUsage_token=${token.auth_token}; expires=${expTime.toGMTString()}`;
                    this.requestData(token.auth_token);
                }
            });
        }
        
        requestData(token) {
            $(`#gitlabRegistryUsageControls1`).removeClass(`d-none`);
            $(`#gitlabRegistryUsageControls2`).removeClass(`d-none`);
            $.ajax({
                url: SERVER_URL,
                accepts: `application/json`,
                method: `GET`,
                dataType: `json`,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader(`Authorization`, `Bearer ${token}`);
                },
                error: () => {
                    this.viewDiv.html($(`<div class="mt-3 alert alert-danger">
                            <strong>Data request failed!</strong> Please try again later.
                        </div>`));
                },
                success: (input) => {
                    $(`button`).attr(`disabled`, false);
                    $(`input`).attr(`disabled`, false);
                    $(`#gitlabRegistryUsageorderByText`).attr(`disabled`, true);
                    this.data = [];
                    this.max = 0;
                    this.maximage = 0;
                    $(`#requestTime`).text(this.getTimeString(input.timestamp * 1000));
                    this.sorted = []; this.imageSorted = []; this.imageSortedAlpha = [];
                    this.tagsSortedAlpha = {}; this.tagsSorted = {}; this.imagesum = {};
                    for (let index in input._embedded.items) {
                        let image = input._embedded.items[index].name;
                        this.imagesum[image] = [0, 0];
                        this.tagsSorted[image] = [];
                        this.imageSortedAlpha.push(image);
                        this.tagsSortedAlpha[image] = [];
                        this.imagesum[image][0] = input._embedded.items[index].size;
                        this.imagesum[image][1] = input._embedded.items[index].disk_size;
                        this.data[image] = {};
                        if (input._embedded.items[index].size != null) {
                            for (let tagindex in input._embedded.items[index]._embedded.related._embedded.items) {
                                let tag = input._embedded.items[index]._embedded.related._embedded.items[tagindex].name;
                                this.data[image][tag] = {
                                    storage: [input._embedded.items[index]._embedded.related._embedded.items[tagindex].size, input._embedded.items[index]._embedded.related._embedded.items[tagindex].disk_size]
                                };
                                this.tagsSortedAlpha[image].push(tag);
                                if (this.data[image][tag].storage[0] > this.max) {
                                    this.max = this.data[image][tag].storage[0];
                                }
                                
                                let i = 0;
                                while (i < this.sorted.length && this.data[this.sorted[i][0]][this.sorted[i][1]].storage[1] > this.data[image][tag].storage[1]) {
                                    i++;
                                }
                                for (let ii = this.sorted.length; ii > i; ii--) {
                                    this.sorted[ii] = this.sorted[ii - 1];
                                }
                                
                                this.sorted[i] = [image, tag];
                                
                                i = 0;
                                while (i < this.tagsSorted[image].length && this.data[image][this.tagsSorted[image][i]].storage[1] > this.data[image][tag].storage[1]) {
                                    i++;
                                }
                                
                                for (let ii = this.tagsSorted[image].length; ii > i; ii--) {
                                    this.tagsSorted[image][ii] = this.tagsSorted[image][ii - 1];
                                }
                                
                                this.tagsSorted[image][i] = tag;
                            }
                            this.tagsSortedAlpha[image].sort();
                        } else {
                            this.imagesum[image][0] = -1;
                            this.imagesum[image][1] = -1;
                            this.imagesum[image] = [-1, -1];
                        }

                        let i = 0;
                        while (i < this.imageSorted.length && this.imagesum[this.imageSorted[i]][1] > this.imagesum[image][1]) {
                            i++;
                        }
                        for (let ii = this.imageSorted.length; ii > i; ii--) {
                            this.imageSorted[ii] = this.imageSorted[ii - 1];
                        }
                        this.imageSorted[i] = image;
                        if (this.imagesum[image][0] > this.maximage) {
                            this.maximage = this.imagesum[image][0];
                        }
                    }
                    this.imageSortedAlpha.sort();
                    
                    this.refreshView = (search=[]) => { this.imageview(this.data, this.imageSorted, this.tagsSorted, this.max, this.imagesum, this.maximage, search); };
                    this.refreshView(this.searchSplit($(`#gitlabRegistryUsageSearchInput`).val()));
                }
            });
        }
        
        searchSplit(search) {
            if (search !== ``) {
                search = search.split(`:`, 2);
                for (let i in search) {
                    search[i] = search[i].split(/\s+/);
                    for (let ii in search[i]) {
                        search[i][ii] = search[i][ii].trim();
                    }
                }
            } else {
                search = [];
            }
            return search;
        }
        
        searchValidate(search, image, tag) {
            if (search.length == 0) {
                return true;
            }
            if (search.length > 1) {
                let img = false;
                if (image !== ``) {
                    if (this.and) {
                        for (let i in search[0]) {
                            if (image.search(search[0][i]) == -1) {
                                return false;
                            }
                        }
                    } else {
                        for (let i in search[0]) {
                            if (image.search(search[0][i]) > -1) {
                                img = true;
                                break;
                            }
                        }
                    }
                } else {
                    img = true;
                }
                if (tag !== ``) {
                    if (this.and) {
                        for (let i in search[1]) {
                            if (tag.search(search[1][i]) == -1) {
                                return false;
                            }
                        }
                    } else {
                        for (let i in search[1]) {
                            if (tag.search(search[1][i]) > -1) {
                                if (img) return true;
                            }
                        }
                    }
                }
            } else {
                if (this.and) {
                    for (let i in search[0]) {
                        if (image.search(search[0][i]) == -1 && tag.search(search[0][i]) == -1) {
                            return false;
                        }
                    }
                } else {
                    for (let i in search[0]) {
                        if (image.search(search[0][i]) > -1 || tag.search(search[0][i]) > -1) {
                            return true;
                        }
                    }
                }
            }
            return this.and;
        }
        
        tagview(data, sorted, max, search=[]) {
            if (!this.descending) {
                sorted = sorted.slice().reverse();
            }
            this.viewDiv.empty();
            let listgroup = $(`<ul class="list-group"></ul>`);
            for (let i in sorted) {
                let image = sorted[i][0];
                let tag = sorted[i][1];
                if(!this.searchValidate(search, image, tag)) {
                    continue;
                }
                let li = $(`<li class="list-group-item"><strong>${image} : ${tag}</strong></li>`);
                let progress = $(`<div class="progress"></div>`);
                progress.css(this.progressStyle);
                let bar = this.createBar(`bg-success`, data[image][tag].storage[0], max);
                let barText = $(`<span class="text-dark">Virtual: <strong>${this.getByteString(data[image][tag].storage[0])}</strong></span>`);
                barText.css(this.barTextStyle);
                progress.append(bar).append(barText);
                li.append(progress);
                progress = $(`<div class="progress"></div>`);
                progress.css(this.progressStyle);
                bar = this.createBar(`bg-danger`, data[image][tag].storage[1], max);
                barText = $(`<span class="text-dark">On disk: <strong>${this.getByteString(data[image][tag].storage[1])}</strong></span>`);
                barText.css(this.barTextStyle);
                progress.append(bar).append(barText);
                li.append(progress);
                listgroup.append(li);
            }
            this.viewDiv.append(listgroup);
        }

        imageview(data, sorted, tagsSorted, max, imagesum, maximage, search=[]) {
            if (!this.descending) {
                sorted = sorted.slice().reverse();
            }
            this.viewDiv.empty();
            let imageListGroup = $(`<ul class="list-group"></ul>`);
            let barcolors = [`bg-danger`, `bg-success`, ``, `bg-info`, `bg-warning`];
            let posi = 0;

            for (let i in sorted) {
                let image = sorted[i], color = 0;
                let imageListItem;
                if (imagesum[image][0] > -1) {
                    imageListItem = $(`<li class="list-group-item"><span><strong><a href="#${i}Tags" data-toggle="collapse">${image}<span class="pl-1"><i class="fas fa-angle-down"></i></span></a></strong></span></li>`);
                    let virtualProgress = $(`<div class="progress" data-toggle="collapse" href="#${i}Tags"></div>`);
                    virtualProgress.css(this.progressStyle);
                    let barText = $(`<span class="text-dark">Virtual: <strong>${this.getByteString(imagesum[image][0])}</strong></span>`);
                    barText.css(this.barTextStyle);
                    virtualProgress.append(barText);
                    imageListItem.append(virtualProgress);
                    let realProgress = $(`<div class="progress" data-toggle="collapse" href="#${i}Tags"></div>`);
                    realProgress.css(this.progressStyle);
                    barText = $(`<span class="text-dark">On disk: <strong>${this.getByteString(imagesum[image][1])}</strong></span>`);
                    barText.css(this.barTextStyle);
                    realProgress.append(barText);
                    let bar, progress;
                    let collapseDiv = $(`<div id="${i}Tags" class="collapse"></div>`);
                    let listgroup = $(`<ul class="list-group"></ul>`);
                    collapseDiv.append(listgroup);
                    let displayImage = (tagsSorted[image].length == 0 && this.searchValidate(search, image, ``));
                    for (let ii in tagsSorted[image]) {
                        if (!this.descending) {
                            tagsSorted[image] = tagsSorted[image].slice().reverse();
                        }
                        let tag = tagsSorted[image][ii];
                        if (barcolors[color] !== ``) {
                            bar = this.createBar(barcolors[color], data[image][tag].storage[0], maximage);
                        } else {
                            bar = this.createBar(``, data[image][tag].storage[0], maximage);
                        }
                        if (posi < 2) {
                            this.createPopover(bar, image, tag, data[image][tag].storage, imagesum[image], `bottom`);
                        } else {
                            this.createPopover(bar, image, tag, data[image][tag].storage, imagesum[image], `top`);
                        }
                        virtualProgress.append(bar);
                        if (barcolors[color] !== ``) {
                            bar = this.createBar(barcolors[color], data[image][tag].storage[1], maximage);
                        } else {
                            bar = this.createBar(``, data[image][tag].storage[1], maximage);
                        }
                        if (posi < 2) {
                            this.createPopover(bar, image, tag, data[image][tag].storage, imagesum[image], `bottom`);
                        } else {
                            this.createPopover(bar, image, tag, data[image][tag].storage, imagesum[image], `top`);
                        }
                        realProgress.append(bar);
                        
                        if (this.searchValidate(search, image, tag)) {
                            displayImage = true;
                            let li = $(`<li class="list-group-item">${tag}</li>`);
                            progress = $(`<div class="progress"></div>`);
                            progress.css(this.progressStyle);
                            bar = this.createBar(barcolors[color], data[image][tag].storage[0], max);
                            barText = $(`<span class="text-dark">Virtual: <strong>${this.getByteString(data[image][tag].storage[0])}</strong></span>`);
                            barText.css(this.barTextStyle);
                            progress.append(bar).append(barText);
                            li.append(progress);
                            progress = $(`<div class="progress"></div>`);
                            progress.css(this.progressStyle);
                            bar = this.createBar(`bg-danger`, data[image][tag].storage[1], max);
                            barText = $(`<span class="text-dark">On disk: <strong>${this.getByteString(data[image][tag].storage[1])}</strong></span>`);
                            barText.css(this.barTextStyle);
                            progress.append(bar).append(barText);
                            li.append(progress);
                            listgroup.append(li);
                        }
                        color = (color + 1) % barcolors.length;
                    }
                    if (displayImage) {
                        imageListItem.append(virtualProgress).append(realProgress).append(collapseDiv);
                        imageListGroup.append(imageListItem);
                        posi++;
                    }
                } else {
                    if (this.searchValidate(search, image, ``)) {
                        imageListItem = $(`<li class="list-group-item"><strong><span>${image}</span></strong></li>`);
                        imageListItem.append(`<div><span class="text-muted">No data</span></div>`);
                        imageListGroup.append(imageListItem);
                    }
                }
            }
            this.viewDiv.append(imageListGroup);
            $(`[data-toggle="popover"]`).popover();
        }
        
        createPopover(bar, image, tag, data, sums) {
            bar.attr(`data-toggle`, `popover`);
            bar.attr(`data-html`, `true`);
            bar.attr(`title`, `${image} : ${tag}`);
            bar.attr(`data-content`, `
                <ul class='list-group'>
                    <li class='list-group-item'>
                        Virtual:
                        <div class='progress' style='position: relative; height: 20px; margin-bottom: 2px;'>
                            <div class='progress-bar bg-success' style='width: ${(data[0] / sums[0]) * 100}%;' role='progressbar' 
                                aria-valuenow='${data[0]}' aria-valuemin='0' aria-valuemax='${sums[0]}'>
                                <span class='text-dark' style='text-align: center; width: 100%; position: absolute; display: block;'>
                                    ${this.getByteString(data[0])}
                                </span>
                            </div>
                        </div>
                    </li>
                    <li class='list-group-item'>
                        Used diskspace: 
                        <div class='progress' style='position: relative; height: 20px; margin-bottom: 2px'>
                            <div class='progress-bar bg-danger' style='width: ${(data[1] / sums[1]) * 100}%;' role='progressbar' 
                                aria-valuenow='${data[1]}' aria-valuemin='0' aria-valuemax='${sums[1]}'>
                                <span class='text-dark' style='text-align: center; width: 100%; position: absolute; display: block;'>
                                    ${this.getByteString(data[1])}
                                </span>
                            </div>
                        </div>
                    </li>
                </ul>`);
            bar.attr(`data-placement`, `top`);
            bar.attr(`data-trigger`, `hover`);
            bar.css(`cursor`, `pointer`);
            bar.hover(() => {
                bar.addClass(`progress-bar-striped progress-bar-animated`);
            }, () => {
                bar.removeClass(`progress-bar-striped progress-bar-animated`);
            });
        }

        createBar(bg, val, max) {
            return $(`<div class="${bg} progress-bar" role="progressbar" style="width: ${(val / max) * 100}%" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="${max}"></div>`);
        }

        getByteString(value) {
            let units, divider;
            if (this.kibis) {
                units = [`B`, `KiB`, `MiB`, `GiB`, `TiB`];
                divider = 1024.0;
            } else {
                units = [`B`, `KB`, `MB`, `GB`, `TB`];
                divider = 1000.0;
            }
            let unit = 0;
            while (value > divider && unit + 1 < units.length) {
                value /= divider;
                unit++;
            }
            return (Math.round(value * 100) / 100) + units[unit];
        }

        getTimeString(time) {
            let units = [`second`, `minute`, `hour`];
            let currentTime = new Date();
            let timediff = currentTime - time;
            if (timediff < 86400000) {
                timediff /= 1000.0;
                let unit = 0;
                while (timediff > 60 && unit + 1 < units.length) {
                    timediff /= 60.0;
                    unit++;
                }
                timediff = Math.round(timediff);
                if (timediff == 1) {
                    return `Last refresh ca. ${timediff} ${units[unit]} ago`;
                } else {
                    return `Last refresh ca. ${timediff} ${units[unit]}s ago`;
                }
            } else {
                let date = new Date(time);
                return `Last refresh: ${date.toLocaleString()}`;
            }
        }
    }

    $(function () {
        "use strict";
        new GitlabRegistryUsage();
    });
}