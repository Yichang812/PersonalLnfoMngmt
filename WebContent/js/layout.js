"use strict";
var q1 = $.url().param('q1');
$('input[name="q1"]').val(q1);
var q2 = $.url().param('q2');
$('input[name="q2"]').val(q2);


var emps;
if (q1) {
    emps = alasql('SELECT * FROM emp WHERE number LIKE ?', [ '%' + q1 + '%' ]);
} else if (q2) {
    emps = alasql('SELECT * FROM emp WHERE name LIKE ?', [ '%' + q2 + '%' ]);
} else {
    emps = alasql('SELECT * FROM emp', []);
}

var layout_name = $('#layout-name');
var col_name_edit = $('#col-name-edit');
var col_name_new = $('#col-name-new');
var alert = $('.delete-alert');
var edit_modal = $('#edit-layout');
var new_modal = $('#new-layout');
var trecords = $('tbody');
var theader = $('thead tr');
var layout_input = $('#new-layout-name');
var format = $('#format').find('li');
var operation = $('#operation').find('input');
//Tools

// var colLay = alasql('select * from layout left join colLayout on layout.id=colLayout.l_id left join colname on colLayout.c_id=colname.id');

function findIdByName(name){
    return alasql('COLUMN OF SELECT id FROM layout WHERE name=?',[name])[0];
}

function findDBByName(name){
    return alasql('COLUMN OF SELECT db_name FROM colname WHERE web=?',[name])[0];
}

function findNameByDB(db){
    return alasql('COLUMN OF SELECT web FROM colname WHERE db_name=?',[db])[0];
}

function findColName(c_id){
    return alasql('COLUMN OF SELECT web FROM colname WHERE id=?',[c_id])[0];
}

function findColDB(c_id){
    return alasql('COLUMN OF SELECT db_name FROM colname WHERE id=?',[c_id])[0];
}

function findCusCol(l_name){
    return alasql('SELECT c1,c2,op,col,format,id FROM metric WHERE l_name=?',[l_name]);
}

function getColList(name){
    // var query = 'select web from layout left join colLayout on layout.id=colLayout.l_id left join colname on colLayout.c_id=colname.id where layout.name=?';
    return alasql('COLUMN OF SELECT c_id FROM colLayout WHERE l_id=?',[findIdByName(name)]);
}

function getAddress(e_id){
    var addr = alasql('SELECT * FROM addr WHERE emp=?',[e_id])[0];
    return addr.street+', '+addr.bldg+', '+addr.house+', '+addr.city+', '+addr.state+', '+addr.zip;
}

function getFamily(e_id){
    var fams = alasql('SELECT * FROM family WHERE emp=?',[e_id]);
    var result = "";
    for(var i = 0; i<fams.length; i++){
        var fam = fams[i];
        result+= fam.relation +': '+fam.name+'<br>';
    }
    return result;
}

function getEdu(e_id){
    var edu = alasql('SELECT * FROM edu WHERE emp=?', [e_id])[0];
    if(edu){
        return 'School: '+edu.school+', Major: '+edu.major+', Graduation: '+edu.grad;
    }
    return '';
}

function getNumColList(){
    var cols = alasql('SHOW COLUMNS FROM emp');
    var list = [];
    for(var i = 0; i< cols.length; i++){
        if(cols[i].dbtypeid=='INT'||cols[i].dbtypeid=='FLOAT'){
            if(cols[i].columnid!='id'&&cols[i].columnid!='sex'){
                list.push(cols[i].columnid);
            }
        }
    }
    return list;
}

function existCName(name,layout){
    var colnames = alasql('COLUMN OF SELECT col FROM metric WHERE l_name = ?',[layout]);
    return (colnames.indexOf(name) > -1);
}
function existLName(name){
    var laynames = my_db.layouts;
    for(var i = 0; i<laynames.length; i++){
        if(laynames[i].name === name){
            //the name exists
            return true;
        }
    }
    return false;
}

function getColVals(col){
    col = findDBByName(col);
    var vals = [];
    for(var i = 0; i <emps.length; i++){
        var val = parseFloat(emps[i][col]);
        vals.push(val);
    }
    return vals;
}

function getSum(col1,col2){
    var result = [];
    for(var i=0;i<col1.length;i++){
        result.push(col1[i]+col2[i]);
    }
    return result;
}
function getDiff(col1,col2){
    var result = [];
    for(var i=0;i<col1.length;i++){
        result.push(col1[i]-col2[i]);
    }
    return result;
}
function getProduct(col1,col2){
    var result = [];
    for(var i=0;i<col1.length;i++){
        result.push(col1[i]*col2[i]);
    }
    return result;
}
function getQuotient(col1,col2){
    var result = [];
    for(var i=0;i<col1.length;i++){
        result.push(col1[i]/col2[i]);
    }
    return result;
}
function getResult(col1, col2, op, format){
    var result = [];
    switch(op.toString()){
        case '0':
            result = reformat(getSum(col1,col2),format);
            break;
        case '1':
            result = reformat(getDiff(col1,col2),format);
            break;
        case '2':
            result = reformat(getProduct(col1,col2),format);
            break;
        case '3':
            result = reformat(getQuotient(col1,col2),format);
            break;
        default:
            console.log('Wrong op code:'+op);
    }
    return result;
}

function reformat(result,format){
    switch (format.toString()){
        case '1':
            return result;
        case '2':
            for(var i = 0; i<result.length; i++){
                result[i] = (result[i]*100).toFixed(2)+'%';
            }
            return result;
        case '3':
            for(var i = 0; i<result.length; i++){
                result[i] = '$'+result[i];
            }
            return result;
        default:
            console.log('Wrong format code'+format);
    }
}

function fillCol(col1,col2, op, col, format,id){
    var td;
    $('<th class="cuscol col'+id+'"><span class="col-name">'+col+' </span><span class="icon-delete" aria-hidden="true" onclick="deleteCol(this)">&times;</span></th>').insertBefore('#last-th');
    var c1 = getColVals(col1);
    var c2 = getColVals(col2);
    var result = getResult(c1, c2, op, format);
    $('tbody tr').each(function(index){
        td = $('<td class="col'+id+'">'+result[index]+'</td>');
        $(this).append(td);
    });
}

function updateMetricDef(ob){
    var symbols = ['&#43','&#45','&#215','&#247'];
    var oper = $('<button class="btn btn-default disabled" style="margin-right: 10px">'+symbols[parseInt(ob.symbol)]+'</button>');
    if(ob.col1){
        var c1 = $('<button class="btn btn-default disabled" style="margin-right: 10px">'+ob.col1+'</button>');
    }
    if(ob.col2){
        var c2 = $('<button class="btn btn-default disabled" style="margin-right: 10px">'+ob.col2+'</button>');
    }

    $('#def-panel').empty().append(c1).append(oper).append(c2);
}

function updateColLayout (l_id,cols) {
    var n = alasql('SELECT MAX(id) + 1 as id FROM colLayout')[0].id;
    for(var i = 0; i<cols.length; i++){
        alasql('INSERT INTO colLayout VALUES (?,?,?)',[n.toString(),l_id.toString(),cols[i].toString()]);
        n++;
    }
}

function addMetric(c1,c2,op,col,format,layout,id){
    alasql('INSERT INTO metric VALUES(?,?,?,?,?,?,?)',[id,c1,c2,op,col,format,layout])
}

function deleteMetric (id) {
    id = parseInt(id);
    alasql("DELETE FROM metric WHERE id=?",[id]);
    location.reload(true);//refresh
}

function highlightActive (name) {

    $('.opt-layout').each(function () {
        var opt= $(this).text();
        if(opt===name){
            $(this).parent().find('.list-group-item-info').removeClass('list-group-item-info');
            $(this).addClass('list-group-item-info');
        }
    });
}

function fillTable(cols){
    for(var i = 0; i<cols.length; i++){
        theader.append('<th>'+findColName(cols[i])+'</th>');
    }
    theader.append('<th id="last-th"><a href="#" data-toggle="modal" id="btn-new-col" data-target="#custom-col" title="New Column" data-placement="right"><span class="glyphicon glyphicon-plus"></span> </a></th>');
    for (var i = 0; i < emps.length; i++) {
        var emp = emps[i];
        var row = $('<tr id="'+emp.id+'"></tr>');
        for (var n = 0; n < cols.length; n++) {
            switch (cols[n]) {
                case 1:
                    row.append('<td><img height=40 class="img-circle" src="img/' + emp.id + '.jpg"></td>');
                    break;
                case 4:
                    row.append('<td>' + DB.choice(emp.sex) + '</td>');
                    break;
                case 19:
                    row.append('<td>' + getAddress(emp.id) + '</td>');
                    break;
                case 20:
                    row.append('<td>' + getFamily(emp.id) + '</td>');
                    break;
                case 21:
                    row.append('<td>' + getEdu(emp.id) + '</td>');
                    break;
                default:
                    row.append('<td>' + emp[findColDB(cols[n])] + '</td>');
            }//switch
        }//for each record
        row.appendTo('#tbody-emps');
    }

    //Custom col
}

function initMenu(){
    for (var i = 0; i<my_db.layouts.length; i++) {
        var layout = my_db.layouts[i];
        var deleteicon = '';
        var editicon = '';
        if(i!==0){
            deleteicon = '<span class="glyphicon glyphicon-trash pull-right btn-delete" onclick="deleteLay(this)"></span>';
            editicon = '<span class="glyphicon glyphicon-pencil pull-right" onclick="showEditModal(this)" data-toggle="modal" data-target="#edit-layout"></span>';
        }
        var li = $('<li class="opt-layout"><a><span class="select-layout-name">' + layout.name + '</span>' + deleteicon + editicon + '</a></li>');
        li.insertBefore('#menu-divider');
    }
    return true;
}

function getFirstLay() {
    var first_lay = alasql('SELECT * FROM layout',[])[0];
    return first_lay.name;
}

function getActiveLay() {
    var active_lay = alasql('SELECT * FROM layout WHERE active=?', ["true"])[0];
    return active_lay.name;
}

function setActiveLay(name) {
    alasql('UPDATE layout SET active="false" WHERE active="true"',[]);
    alasql('UPDATE layout SET active="true" WHERE name=?',[name]);
    highlightActive(name);
}

function resetTable(layout) {
    theader.children('th').remove();
    trecords.children('tr').remove();
    setActiveLay(layout);
    fillTable(getColList(getActiveLay()));
    $('#cur-lay-name').text(layout);
    var metrics = findCusCol(layout);
    for(var i = 0; i<metrics.length; i++){
        var metric = metrics[i];
        fillCol(metric.c1,metric.c2, metric.op, metric.col, metric.format,metric.id);
    }
}

function initColMadal (){
    $('#custom-col-name').val('');
    $('#col1-text').text('Column1');
    $('#col2-text').text('Column2');
    $('#operation input:first-child').attr('checked');
    $('#format-text').text('Format');
    $('#def-panel').text('Select the column and operation to define your metric.');
}

function init() {
    var activeLay = getActiveLay();
    $('#cur-lay-name').text(activeLay);
    fillTable(getColList(activeLay));
    initMenu();
    var metrics = findCusCol(getActiveLay());
    for(var i = 0; i<metrics.length; i++){
        var metric = metrics[i];
        fillCol(metric.c1,metric.c2, metric.op, metric.col, metric.format,metric.id);
    }
    highlightActive(getActiveLay());
}


//=====================functions for setup modal contents============================
//layout modal
for (var i = 0; i<my_db.layouts.length; i++){
    var layout = my_db.layouts[i];
    var l_op = $('<option>'+layout.name+'</option>');
    layout_name.append(l_op);
}

for (var i = 0; i<my_db.colNames.length; i++){
    var colName = my_db.colNames[i];
    var c_op = $('<option>'+colName.web+'</option>');
    c_op.attr('value',colName.id);
    col_name_new.append(c_op);
    col_name_edit.append(c_op.clone());
}


//init multi-select
$(function() {
    col_name_new.multipleSelect({
        width: '100%',
        selectAll: false,
        filter:true
    });
    col_name_edit.multipleSelect({
        width: '100%',
        selectAll: false,
        filter:true
    });
});

var EditLayout = '';

function showEditModal (ele) {
    var selectLay = $(ele).siblings('.select-layout-name').text();
    console.log('edit:'+selectLay);
    EditLayout = selectLay
    $('#edit-layout-name').text(selectLay);
    col_name_edit.multipleSelect("setSelects",getColList(selectLay));
}

function editLay () {
    var editName = EditLayout;
    var cols = $('#col-name-edit').val();
    var editId = findIdByName(editName);

    alasql("DELETE FROM colLayout WHERE l_id=?",[editId]);

    updateColLayout(editId,cols);
    resetTable(editName);
    edit_modal.modal('hide');
    location.reload(true);//refresh page
}

function deleteLay (ele) {
    var deleteLay = $(ele).siblings('.select-layout-name').text();
    $('#delete-lay').text(deleteLay);

    $('#alert-modal').modal('show');

    $('#btn-yes').click(function () {
        alasql("DELETE FROM colLayout WHERE l_id=?",[findIdByName(deleteLay)]);
        alasql("DELETE FROM layout WHERE name=?",[deleteLay]);

        alasql("DELETE FROM metric WHERE l_name=?",[deleteLay]);
        resetTable(getFirstLay());
        location.reload(true);
    });
}

function deleteCol (ele) {
    var id = $(ele).parent('th').attr('class').substring(10);
    var col = $(ele).siblings('.col-name').text();
    $('#delete-lay').text(col);
    $('#alert-modal').modal('show');
    $('#btn-yes').click(function () {
        deleteMetric(id)
    });
}


//custom column modal
var colList = getNumColList();
for(var i = 0; i<colList.length; i++){
    var op = $('<li><a href="#">'+findNameByDB(colList[i])+'</a></li>');
    $('#col1,#col2').append(op);
}


$(document).ready(function () {
    //init view
    init();
    $('#btn-new-col').tooltip();
    var custom_col_modal = $('#custom-col');
    var custom_col_name = $('#custom-col-name');

    var metric_def = {
        symbol : '0',
        format : '1'
    };

//set column1
    $('#col1').find('li').on('click',function () {
        var col_name = $(this).text();
        $('#col1-text').text(col_name);
        metric_def['col1'] = col_name;
        updateMetricDef(metric_def);
    });

//set column2
    $('#col2').find('li').on('click',function () {
        var col_name = $(this).text();
        $('#col2-text').text(col_name);
        metric_def['col2'] = col_name;
        updateMetricDef(metric_def);
    });

//set format
    format.on('click',function(){
        $('#format-text').text($(this).text());
        metric_def.format = $(this).attr('value')
    });

//set operation
    operation.on('change',function () {
        metric_def.symbol = $(this).val();
        updateMetricDef(metric_def);
    });

//create custom col
    $('#btn-save-col').click(function () {
        var name = custom_col_name.val();
        var layout = getActiveLay();
        var count = alasql('SELECT MAX(id)+1 as id FROM metric')[0].id;
        if(name===''){
            $('#warning-text').text(' Sorry! The column name cannot be EMPTY!');
            $('#warning-modal').modal('show');
        }else if(existCName(name,layout)){
            $('#warning-text').text(' Sorry! The column name already EXISTS in current layout!');
            $('#warning-modal').modal('show');
        }else if(!metric_def.col1||!metric_def.col2){
            $('#warning-text').text(' Sorry! You must select TWO columns!');
            $('#warning-modal').modal('show');
        }else{
            fillCol(metric_def.col1,metric_def.col2,metric_def.symbol,name,metric_def.format,count);
            addMetric(metric_def.col1,metric_def.col2,metric_def.symbol,name,metric_def.format,layout,count);
            delete metric_def.col1;
            delete metric_def.col2;
            metric_def.format = '1';
            metric_def.symbol = '0';
            initColMadal();

            custom_col_modal.modal('hide');
        }
    });

//update table content when user select a layout name
    $('.opt-layout').click(function () {
        resetTable( $(this).text());
    });

//Create layout
    $('#btn-create-lay').click(function () {
        var l_id = alasql('SELECT MAX(id) + 1 as id FROM layout')[0].id;
        var name = layout_input.val();
        if(name==='') {
            $('#warning-text').text(' Sorry! The layout name cannot be EMPTY!');
            $('#warning-modal').modal('show');
        }else if(existLName(name)){
            $('#warning-text').text(' Sorry! The layout name already EXISTS!');
            $('#warning-modal').modal('show');
        }else{
            if(l_id){
                alasql('INSERT INTO layout VALUES (?,?,?)', [l_id.toString(), name, "false"]);
            }else{
                alasql('INSERT INTO layout VALUES (?,?,?)', ['1', name, "false"]);
            }
            setActiveLay(name);
            fillTable(getColList(name));
            var cols = $('#col-name-new').val();
            updateColLayout(l_id, cols);
            new_modal.modal('hide');
            location.reload(true);//refresh
        }
    });

    //show employee's individual page when click on the row
    $('tbody tr').on('click',function () {
        window.location.href = 'emp.html?id=' + $(this).attr('id');
    });
});