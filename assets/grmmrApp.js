// Set up application most used variables
var app = {
    searchParams: new URLSearchParams(window.location.search),
    fetchHeaders: new Headers({ 'cache-control': 'max-age=3600' }),
    urlFilters: 'grmmr_filters.json',
    urlDataset: 'grmmr_dataset.json',
    urlHelp: 'grmmr_help.json',
    itemsPerPage: 7
}

// Disabling Mustache escaping.
Mustache.escape = function(text) {return text;}

// Render app navigation
$('#navbar-container').html(Mustache.render('<nav class="navbar navbar-expand-lg navbar-dark bg-dark"><a class="navbar-brand" href=".">GRMMR</a><button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbar-main-collapse" aria-controls="navbar-main-collapse" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="navbar-main-collapse"><ul class="navbar-nav mr-auto">{{#navlinks}}<li class="nav-item{{#isActive}} active{{/isActive}}"><a class="nav-link" href="{{#handle}}?go={{handle}}{{/handle}}{{^handle}}.{{/handle}}">{{title}}{{#isActive}} <span class="sr-only">(current)</span>{{/isActive}}</a></li>{{/navlinks}}</ul></div></nav>', {
    navlinks: [
        { title: "Контексты", handle: false },
        { title: "Тесты", handle: "test" },
        { title: "Помощь", handle: "help" }
    ],
    isActive: function(){
        if((this.handle == false && !app.searchParams.get('go')) || this.handle == app.searchParams.get('go')){
            $('title').html(this.title + ' | GRMMR')
            return true
        } else return false
    }
}))

// APP ROUTES
if(!app.searchParams.get('go')){
    // CONTEXTS
    // Render the layout
    $('#root-container').html('<div class="row"><div class="col-lg-3"><form method="GET" action="" class="" id="filters-container"></form></div><div class="col-lg-9"><div id="stats-container"></div><div id="results-container"></div><ul class="pagination justify-content-center mb-0" id="pagination-container"></ul></div></div>')
    // Get current filters
    var currentFilters = app.searchParams.getAll('filter')
    var currentDiscourses = app.searchParams.getAll('discourse')
    // Fetch and render search filters
    fetch(app.urlFilters, { method: "GET", headers: app.fetchHeaders }).then(function(filters){
        filters.json().then(function(filters){
            for(i = 0; i < filters.filters.length; i++){filters.filters[i].id = i}
            filters.ifChecked = function(){return (currentFilters.includes(this.toString()) || currentDiscourses.includes(this.toString()))}
            $('#filters-container').html(Mustache.render('<div class="card card-collapse mb-3"><h6 class="card-header cursor-pointer" id="filter-card-heading-discourses" data-toggle="collapse" data-target="#filter-collapse-discourses" aria-controls="filter-collapse-discourses" aria-expanded="true">Discourses</h6><div class="collapse show" id="filter-collapse-discourses" aria-labelledby="#filter-card-heading-discourses" data-parent="#filters-container"><ul class="list-group list-group-flush"><li class="list-group-item">{{#discourses}}<div class="custom-control custom-checkbox"><input type="checkbox"{{#ifChecked}} checked="true"{{/ifChecked}} name="discourse" value="{{.}}" class="custom-control-input" id="filters-checkbox-{{.}}" /><label class="custom-control-label" for="filters-checkbox-{{.}}">{{.}}</label></div>{{/discourses}}</li></ul></div></div>{{#filters}}<div class="card card-collapse mb-3"><h6 class="card-header cursor-pointer" id="filter-card-heading-{{id}}" data-toggle="collapse" data-target="#filter-collapse-{{id}}" aria-controls="filter-collapse-{{id}}" aria-expanded="false">{{group}}</h6><div class="collapse" id="filter-collapse-{{id}}" aria-labelledby="#filter-card-heading-{{id}}" data-parent="#filters-container"><ul class="list-group list-group-flush">{{#sub}}<li class="list-group-item">{{#name}}<h6>{{name}}</h6>{{/name}}{{#types}}<div class="custom-control custom-checkbox"><input type="checkbox"{{#ifChecked}} checked="true"{{/ifChecked}} name="filter" value="{{.}}" class="custom-control-input" id="filters-checkbox-{{.}}" /><label class="custom-control-label" for="filters-checkbox-{{.}}">{{.}}</label></div>{{/types}}</li>{{/sub}}</ul></div></div>{{/filters}}<div class="card mb-3"><div class="card-body py-3 d-flex"><button type="submit" class="btn btn-outline-primary btn-block flex-fill"><i class="la la-search mr-2"></i>Поиск</button><a title="Сброс" href="." class="btn btn-outline-secondary ml-2"><i class="la la-redo-alt"></i></a></div></div>', filters))
        })
    })
    // Fetch the dataset
    fetch(app.urlDataset, { method: "GET", headers: app.fetchHeaders }).then(function(data){
        data.json().then(function(data){
            var currentResults = []
            // Filtering the results
            for(i = 0; i < data.length; i++){
                data[i].itemID = i
                if((currentFilters.length == 0 && currentDiscourses.length == 0)) {currentResults.push(data[i])} else {
                    if((currentDiscourses.length > 0 && currentDiscourses.includes(data[i].discourse)) || currentDiscourses.length == 0){
                        if(currentFilters.length > 0){
                            currentFilters.forEach(function(filter){
                                if(data[i].tags.includes(filter)) currentResults.push(data[i])
                            })
                        } else if(currentFilters.length == 0)  currentResults.push(data[i])
                    }
                }
            }
            // Paginating the results
            var pagination = {
                isVisible: (currentResults.length > app.itemsPerPage),
                pageCurrent: app.searchParams.get('page') || 1,
                pagePrevious: false,
                pageNext: false,
                pages: []
            }
            app.searchParams.delete('page')
            pagination.currentSearch = (currentFilters.length == 0 && currentDiscourses.length == 0) ? '?' : '?' + app.searchParams.toString() + '&'
            for(i = 1; i <= Math.ceil((currentResults.length / app.itemsPerPage) * Math.pow(10, 0)); i++){pagination.pages[i] = { number: i, isActive: (i == pagination.pageCurrent) }}
            pagination.pages = pagination.pages.slice(1)
            pagination.pagePrevious = (pagination.pageCurrent == 1) ? false : parseInt(pagination.pageCurrent) - 1
            pagination.pageNext = (pagination.pageCurrent == pagination.pages.length) ? false : parseInt(pagination.pageCurrent) + 1
            $('#pagination-container').html(Mustache.render('{{#isVisible}}<li class="page-item{{^pagePrevious}} disabled{{/pagePrevious}}"><a class="page-link"{{#pagePrevious}} href="{{currentSearch}}page={{pagePrevious}}"{{/pagePrevious}}"><i class="la la-angle-left"></i></a></li>{{#pages}}<li class="page-item{{#isActive}} active{{/isActive}}"><a class="page-link" href="{{currentSearch}}page={{number}}">{{number}}</a></li>{{/pages}}<li class="page-item{{^pageNext}} disabled{{/pageNext}}"><a class="page-link"{{#pageNext}} href="{{currentSearch}}page={{pageNext}}"{{/pageNext}}><i class="la la-angle-right"></i></a></li>{{/isVisible}}', pagination))
            // Rendering current search stats
            if(currentResults.length > 0 && (currentFilters.length > 0 || currentDiscourses.length > 0)){
                $('#stats-container').html(Mustache.render('<div class="card mb-3"><div class="card-body"><div class="d-flex text-muted"><span>Найдено результатов: <b>{{resultsCount}}</b></span><span class="ml-auto">Страница <b>{{pageCurrent}} из {{pagesCount}}</b></span></div></div></div>', {
                    pageCurrent: pagination.pageCurrent,
                    pagesCount: pagination.pages.length,
                    resultsCount: currentResults.length
                }))
            }
            // Rendering the results
            $('#results-container').html(Mustache.render('{{^data}}<div class="card card-tabbed mb-3"><div class="card-body text-muted d-flex align-items-center"><i class="la la-question-circle la-3x mr-3"></i><div><h6>Ничего не нашлось...</h6><p class="mb-0">Попробуйте изменить параметры поиска.</p></div></div></div>{{/data}}{{#data}}<div class="card mb-3 search-result"><ul class="list-group list-group-flush"><li class="list-group-item"><ul class="nav nav-tabs" id="translationsTabs_{{itemID}}" role="tablist"><li class="nav-item"><a class="nav-link active" id="translationsTabsPills_{{itemID}}_en" data-toggle="tab" href="#translationsTabsContent_{{itemID}}_en" role="tab" aria-controls="translationsTabsContent_{{itemID}}_en" aria-selected="true">en</a></li>{{#lang}}<li class="nav-item"><a class="nav-link" id="translationsTabsPills_{{itemID}}_{{code}}" data-toggle="tab" href="#translationsTabsContent_{{itemID}}_{{code}}" role="tab" aria-controls="translationsTabsContent_{{itemID}}_{{code}}">{{code}}</a></li>{{/lang}}</ul><div class="tab-content"><div class="tab-pane active" id="translationsTabsContent_{{itemID}}_en" role="tabpanel" aria-labelledby="translationsTabsPills_{{itemID}}_en"><blockquote class="blockquote mb-1 mt-3 grmml-render">{{grmml}}</blockquote></div>{{#lang}}<div class="tab-pane" id="translationsTabsContent_{{itemID}}_{{code}}" role="tabpanel" aria-labelledby="translationsTabsPills_{{itemID}}_{{code}}"><blockquote class="blockquote mb-1 mt-3">{{txt}}</blockquote></div>{{/lang}}</div></li><li class="list-group-item"><div class="d-flex justify-content-between align-items-center"><div>{{#tags}}<a href="?filter={{.}}" class="badge badge-light mr-1">{{.}}</a>{{/tags}}</div><ul class="list-inline col-md-3 col-sm-4"><li class="list-inline-item"><a href="?discourse={{discourse}}"><i class="la la-pencil mr-1"></i>{{discourse}}</a></li><li class="list-inline-item context-source"><i class="la la-chain mr-1"></i>{{src}}</li></ul></div></li></ul></div>{{/data}}', { data: currentResults.slice((pagination.pageCurrent - 1) * app.itemsPerPage, pagination.pageCurrent * app.itemsPerPage) }))
            $('.grmml-render').each(function(i){$(this).html($(this).html().replace(/\[[sf]:[a-zA-Z -;]+](.+?)\[\/[sf]\]/gm, '$1').replace(/\[w:([a-zA-Z -;]+)](.+?)\[\/w\]/gm, '<mark title="$1">$2</mark>'))})
            $('.grmml-render mark').tooltip()
        })
    })


} else if(app.searchParams.get('go') == 'test'){
    // TESTS
    $('#root-container').html('☂...')

} else if(app.searchParams.get('go') == 'help'){
    // HELP
    // Fetch and render help articles
    fetch(app.urlHelp, { method: "GET", headers: app.fetchHeaders }).then(function(data){
        data.json().then(function(data){
            $('#root-container').html(Mustache.render('<div class="row"><div class="col-lg-3">{{#sections}}<div class="card card-collapse mb-3"><h6 class="card-header">{{sectionName}}</h6><ul class="list-group list-group-flush">{{#articles}}<li class="list-group-item"><a href="#{{sectionID}}_{{articleID}}">{{articleName}}</a></li>{{/articles}}</ul></div>{{/sections}}</div><div class="col-lg-9">{{#sections}}<div class="card mb-3" id="{{sectionID}}"><h4 class="card-header py-3 bg-transparent">{{sectionName}}</h4><ul class="list-group list-group-flush">{{#articles}}<li id="{{sectionID}}_{{articleID}}" class="list-group-item"><h5>{{articleName}}</h5>{{articleContents}}</li>{{/articles}}</ul></div>{{/sections}}</div></div>', data))
        })
    })    



} else {
    // UNKNOWN ROUTES
    $('#root-container').html('<div class="card card-tabbed mb-3"><div class="card-body text-muted d-flex align-items-center"><i class="la la-file la-3x mr-3"></i><div><h6>Страница не найдена</h6><p class="mb-0">Пожалуйста, перепроверьте ссылку.</p></div></div></div>')
}