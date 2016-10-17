/**
 * Created by li_yi-pc on 10/13/2016.
 */
var layouts = alasql('SELECT * FROM layout', []);
var colNames = alasql('SELECT * FROM colname', []);
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
var trecords = $('#tbl-download tbody');
var theader = $('#tbl-download thead tr');
var i;



//Tools
function getColList(name){
    var colList = [];
    var selected_col = alasql('SELECT c_id FROM colLayout WHERE l_id=?',[findIdByName(name)]);
    for(i = 0; i<selected_col.length; i++){
        colList.push(selected_col[i].c_id);
    }
    return colList;
}

function findIdByName(name){
    var id = alasql('SELECT id FROM layout WHERE name=?',[name])[0];
    return id.id;
}

function findColName(c_id){
    var name = alasql('SELECT web FROM colname WHERE id=?',[c_id])[0];
    return name.web;
}
function findColDB(c_id){
    var coldb = alasql('SELECT db_name FROM colname WHERE id=?',[c_id])[0];
    return coldb.db_name;
}
function findAddrById(e_id){
    var addr = alasql('SELECT * FROM addr WHERE emp=?',[e_id])[0];
    //zip STRING, state STRING, city STRING, street STRING, bldg STRING, house INT
    return addr.street+addr.bldg+', '+addr.house+', '+addr.city+', '+addr.state+', '+addr.zip;
}
function findFamById(e_id){
    var fams = alasql('SELECT * FROM family WHERE emp=?',[e_id]);
    var result = "";
    for(var x = 0; x<fams.length; x++){
        var fam = fams[x];
        if(fam){
            //name STRING, sex INT, birthday STRING, relation STRING, cohabit INT, care INT
            result+= fam.relation +': '+fam.name+', B-day: '+fam.birthday+', Cohabitation:'+DB.choice(fam.cohabit)+', Dependent: '+DB.choice(fam.care)+'<br>';
        }
        break;
    }
    return result;
}
function findEduById(e_id){
    var edu = alasql('SELECT * FROM edu WHERE emp=?', [e_id])[0];
    //school STRING, major STRING, grad STRING
    if(edu){
        return 'School: '+edu.school+', Major: '+edu.major+', Graduation: '+edu.grad;
    }else{
        return '';
    }
}
function setActiveLay(name){
    alasql('UPDATE layout SET active="false" WHERE active="true"',[]);
    alasql('UPDATE layout SET active="true" WHERE name=?',[name]);

}
function getActiveLay(){
    var active_lay = alasql('SELECT * FROM layout WHERE active=?',["true"])[0];
    return active_lay.name;
}
function fillTable(cols){
    for (i = 0; i < emps.length; i++) {
        var emp = emps[i];
        var row = $('<tr></tr>');
        for (var n = 0; n < cols.length; n++) {
            switch (cols[n]) {
                case 1:
                    row.append('<td><img height=40 class="img-circle" src="img/' + emp.id + '.jpg"></td>');
                    break;
                case 2:
                    row.append('<td><a href="emp.html?id=' + emp.id + '">' + emp.number + '</a></td>');
                    break;
                case 4:
                    row.append('<td>' + DB.choice(emp.sex) + '</td>');
                    break;
                case 19:
                    row.append('<td>' + findAddrById(emp.id) + '</td>');
                    break;
                case 20:
                    row.append('<td>' + findFamById(emp.id) + '</td>');
                    break;
                case 21:
                    row.append('<td>' + findEduById(emp.id) + '</td>');
                    break;
                default:
                    row.append('<td>' + emp[findColDB(cols[n])] + '</td>');
            }//switch
        }//for each record
        row.appendTo('#tbody-emps');
    }
}

//==================================================================

//setup modal content
for (i = 0; i<layouts.length; i++){
    var layout = layouts[i];
    var l_op = $('<option>'+layout.name+'</option>');
    layout_name.append(l_op);
}

for (i = 0; i<colNames.length; i++){
    var colName = colNames[i];
    var c_op = $('<option>'+colName.web+'</option>');
    c_op.attr('value',colName.id);
    col_name_new.append(c_op);
    col_name_edit.append(c_op.clone());
}

$('#btn-edit').click(function () {
    new_modal.modal('hide');
    edit_modal.modal('show');
    var currentLay = layout_name.val();
    col_name_edit.multipleSelect("setSelects",getColList(currentLay));
});

$(function() {
    col_name_new.multipleSelect({
        width: '100%'
    });
    col_name_edit.multipleSelect({
        width: '100%'
    });

});

//=========================================================================

//set table content
fillTable(getColList(getActiveLay()));

//load layout setting
layout_name.change(function () {
    col_name_edit.multipleSelect("setSelects",getColList($(this).val()));
});

//save new layout
$('#new-layout-form').submit(function () {
    var l_id = alasql('SELECT MAX(id) + 1 as id FROM layout')[0].id;
    var name = $('#new-layout-name').val();
    alasql('INSERT INTO layout VALUES (?,?)',[l_id.toString(),name]);
    //save to colLayout
    var n = alasql('SELECT MAX(id) + 1 as id FROM colLayout')[0].id;
    var cols= $('#col-name-new').val();
    for(i = 0; i<cols.length; i++){
        alasql('INSERT INTO colLayout VALUES (?,?,?)',[n.toString(),l_id.toString(),cols[i].toString()]);
        n++;
    }
});


//delete layout
$('#btn-delete-lay').click(function(){
    $('#edit-layout').modal('hide');
    var deleteLay = layout_name.val();
    $('<div></div>').appendTo('body')
        .html('<h4 style="text-align: center;margin-top: 55px">Are you sure you want to delete <strong>'+deleteLay+'?</strong></h4>')
        .dialog({
            resizable: false,
            height: 200,
            width: 400,
            modal: true,
            title:"Delete Layout",
            buttons: {
                'Yes,delete it': function () {
                    alasql("DELETE FROM colLayout WHERE l_id=?",[findIdByName(deleteLay)]);
                    alasql("DELETE FROM layout WHERE name=?",[deleteLay]);
                    $(this).dialog("close");
                },
                No: function () {
                    $(this).dialog("close");
                }
            }
        });
});

//======================================================================

//update table header
$('.opt-layout').click(function () {
    var option = $(this).text();
    theader.children('th').remove();
    trecords.children('tr').remove();
    setActiveLay(option);
    var col_ls = getColList(getActiveLay());
    for(i=0; i<col_ls.length; i++){
        theader.append('<th>'+findColName(col_ls[i])+'</th>');
    }
    fillTable(col_ls);
});

