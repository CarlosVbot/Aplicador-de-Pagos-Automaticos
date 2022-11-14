
define(['N/log', 'N/record', 'N/search','N/runtime','N/task', 'N/format'],

    (log, record, search, runtime,task,format) => {


        const getInputData = (inputContext) => {
            try{
                var busqueda_lineas = search.create({
                    type: 'customrecord_efx_db_txt_detalle',
                    filters: [
                        ['isinactive', search.Operator.IS, 'F']
                        , 'and',
                        ['custrecord_efx_db_processed', search.Operator.IS, 'F']
                        , 'and',
                        ['custrecord_efx_db_abono', search.Operator.IS, 'T']],
                    columns: [

                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'custrecord_efx_db_tb'}),
                        search.createColumn({name: 'custrecord_efx_db_line'}),
                        search.createColumn({name: 'custrecord_efx_db_payment'}),
                        search.createColumn({name: 'custrecord_efx_db_processed'}),
                        search.createColumn({name: 'custrecord_efx_db_pago'}),
                        search.createColumn({name: 'custrecord_efx_db_reference'}),
                        search.createColumn({name: 'custrecord_efx_db_abono'}),
                        search.createColumn({name: 'custrecord_efx_fecha_pago'})
                    ]
                });

                var ejecutar_lineas = busqueda_lineas.run();
                var resultado_lineas = ejecutar_lineas.getRange(0, 100);
                var busqueda_lineas_count = busqueda_lineas.runPaged().count;
                var linea_referencia = new Array();
                var lineas_array = [];
                for (var y = 0; y < resultado_lineas.length; y++) {
                    var linea_internalid = resultado_lineas[y].getValue({name: 'internalid'}) || '';
                    var linea_cabecera = resultado_lineas[y].getValue({name: 'custrecord_efx_db_tb'}) || '';
                    var linea_linea = resultado_lineas[y].getValue({name: 'custrecord_efx_db_line'}) || '';
                    var linea_pago = resultado_lineas[y].getValue({name: 'custrecord_efx_db_payment'}) || '';
                    var linea_procesado = resultado_lineas[y].getValue({name: 'custrecord_efx_db_processed'}) || '';
                    var linea_importe = resultado_lineas[y].getValue({name: 'custrecord_efx_db_pago'}) || '';
                    linea_referencia[y] = resultado_lineas[y].getValue({name: 'custrecord_efx_db_reference'}) || '';
                    var linea_abono = resultado_lineas[y].getValue({name: 'custrecord_efx_db_abono'}) || '';
                    var linea_fecha_pago = resultado_lineas[y].getValue({name: 'custrecord_efx_fecha_pago'}) || '';

                    lineas_array.push({
                        linea_internalid: linea_internalid,
                        linea_cabecera: linea_cabecera,
                        linea_linea: linea_linea,
                        linea_pago: linea_pago,
                        linea_procesado: linea_procesado,
                        linea_importe: linea_importe,
                        linea_referencia: linea_referencia[y],
                        linea_abono: linea_abono,
                        linea_fecha_pago: linea_fecha_pago,
                        linea_count: busqueda_lineas_count
                    });
                }
                return lineas_array
            } catch (e) {
                log.debug({title: '80Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
            }


        }

        var index=0;
        const map = (mapContext) => {


            try {
                var datos = JSON.parse(mapContext.value);


                mapContext.write({
                    key: index,
                    value: datos
                });
                index++;
            } catch (e) {
                log.debug({title: '108Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
            }

        }

        var count = 0;
        var factimbrar =[];
        var mainFact = 0;
        const reduce = (reduceContext) => {
            try{

                var data = JSON.parse(reduceContext.values[0]);
                log.audit({title: 'reduce - data', details: data});
                var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                var linea_fecha_pago = data.linea_fecha_pago;
                var linea_internalid = data.linea_internalid;
                var linea_referencia = data.linea_referencia;
                var linea_linea = data.linea_linea;
                var linea_importe = data.linea_importe;
                var ImporteTotal = data.linea_importe;
                var control = false;
                var linea_fecha_transformada  = TransformarFecha(linea_fecha_pago)
                log.audit({title: 'reduce - linea_fecha_transformada', details: linea_fecha_transformada});
                var ObjetoFacturas =  ObtenerFacturasPendientes(linea_referencia);
                log.audit({title: 'reduce - ObjetoFacturas', details: ObjetoFacturas});

              

                // funcion obtener tipo de pago
                var formaDePago = ObtenerTipoDePago(linea_linea);
                log.audit({title: 'reduce - formaDePago', details: formaDePago});
                // recorrer facturas
                if(ObjetoFacturas!=false){
                    for (var fac = 0; fac < ObjetoFacturas.length; fac++){
                        var ReferenciaFactura = ObjetoFacturas[fac].fac_referencia
                        if(linea_referencia==ReferenciaFactura){
                            //VARIABLES factura
                            control = true;
                            var fac_rfc = ObjetoFacturas[fac].fac_rfc;
                            var fac_amount = ObjetoFacturas[fac].fac_amount;
                            var rfc_tipo = ObtenerTipoRfc(fac_rfc);
                            log.audit({title: 'reduce - rfc_tipo', details: rfc_tipo});
                            var fac_internalid = ObjetoFacturas[fac].fac_internalid;
                            var fac_amountdue = ObjetoFacturas[fac].fac_amountdue
                            var Controlpp = false;
                            var DatosProntoPago = ObtenerDatosProntopago(Controlpp);
                            log.audit({title: 'reduce - DatosProntoPago', details: DatosProntoPago});
                            var fac_date = ObjetoFacturas[fac].fac_date;
                            var Tutelado = ObjetoFacturas[fac].fac_son;
                            var fac_date_trasnformada = TransformarFecha(ObjetoFacturas[fac].fac_date)
                            log.audit({title: 'reduce - fac_date_trasnformada', details: fac_date_trasnformada});
                            var Cliente = ObjetoFacturas[fac].fac_entity;
                            var Objcli = ObtenerInformacionCliente(Tutelado);
                            log.audit({title: 'reduce - Objcli', details: Objcli});
                            var resta = AgregarProntoPago(DatosProntoPago,fac_amount,fac_internalid,linea_importe,fac_amountdue,fac_date,linea_fecha_transformada,Controlpp,0)
                            log.audit({title: 'reduce - resta', details: resta});
                            var ObjRec = ObtenerInformacionRecargos(Tutelado);
                            log.audit({title: 'reduce - ObjRec', details: ObjRec});
                            var Objsal = ObtenerInformacionSaldoFavor (Tutelado,Cliente)
                            log.audit({title: 'reduce - Objsal', details: Objsal});
                            var FacValor = parseFloat(fac_amountdue)  + resta;
                            var PagoValor = parseFloat(ImporteTotal);
                            var res =  '';
                            if(ImporteTotal == FacValor){
                                if(ImporteTotal>0){
                                    res = PagoJusto(PagoValor,FacValor,ObjRec,Objsal,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)
                                    log.audit({title: 'reduce - PagoJusto', details: PagoJusto});
                                    ImporteTotal =  PagoValor - (FacValor + ObjRec[0].SumaMontoRecargos);
                                }
                                if(res){
                                    factimbrar.push({fac_internalid:res})

                                }
                                log.audit({title:'resPagoJusto',details:res});
                            }
                            if(ImporteTotal > FacValor ){


                                if(ImporteTotal>0){
                                    res = PagaMas(PagoValor,FacValor,ObjRec,Objsal,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)
                                    log.audit({title: 'reduce - PagaMas', details: PagaMas});
                                    ImporteTotal =  PagoValor - (FacValor+ ObjRec[0].SumaMontoRecargos);
                                }
                                if(res){
                                    factimbrar.push({fac_internalid:res})

                                }
                                log.audit({title:'resPagaMas',details:res});
                            }else if(ImporteTotal < FacValor){
                                log.audit({title:'PagaMenos'});


                                if(ImporteTotal>0){
                                    res = PagaMenos(PagoValor,FacValor,ObjRec,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)
                                    log.audit({title: 'reduce - PagaMenos', details: PagaMenos});
                                    ImporteTotal =  PagoValor - (FacValor+ ObjRec[0].SumaMontoRecargos);
                                }
                                if(res){
                                    factimbrar.push({fac_internalid:res})

                                }
                                log.audit({title:'resPagaMenos',details:res});
                            }
                            log.audit({title:'>>>>res',details:res});
                        }
                    }
                }

                if(control==false){
                    var PagoSF =  PagosSinFactura(linea_referencia,linea_fecha_transformada,formaDePago,ImporteTotal,meses);
                    log.audit({title:'PagoSF',details:PagoSF});
                    factimbrar.push({fac_internalid:PagoSF})
                }

                var lineaMod = record.load({
                    type: 'customrecord_efx_db_txt_detalle',
                    id: linea_internalid,
                    isDynamic: true
                });

                lineaMod.setValue({
                    fieldId: 'custrecord_efx_db_processed',
                    value: true,
                })
                lineaMod.save();
                count++;
                log.audit({title:'>>>>>>>>>>count',details:count});
                if(factimbrar.length>0){
                    if(data.linea_count==count){
                        var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
                        mrTask.scriptId = 'customscript_efx_db_inv_mr';
                        mrTask.deploymentId = 'customdeploy_efx_db_inv_mr';
                        mrTask.params = {custscript_efx_db_facturas: factimbrar};
                        log.audit({title:'>>>>>>>>>>parametros',details:mrTask.params});
                        var mrTaskId = mrTask.submit();

                        return mrTaskId;
                    }

                }

            }
            catch (e) {
                count++;
                log.debug({title: '256Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();


            }

        }

        const summarize = (summaryContext) => {

        }

        function TransformarFecha(linea_fecha_pago){
            try{
                var datearray = linea_fecha_pago.split('/');
                var mesarray = parseInt(datearray[1])
                var Fecha = datearray[0] +'/'+ mesarray +'/'+datearray[2]
                log.audit({title: 'map - Fecha', details: Fecha});
                var linea_fecha_pago_t = format.parse({
                    value: Fecha,
                    type: format.Type.DATE
                });
                return linea_fecha_pago_t;
            }catch (e) {
                log.debug({title: '285Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerFacturasPendientes(linea_referencia) {
            try {
                var busqueda_facturas = search.create({
                    type: search.Type.INVOICE,
                    filters: [
                        ['custbody_ref_banc', search.Operator.IS, linea_referencia ]
                        , 'and',
                        ['status', search.Operator.IS, 'CustInvc:A']
                        , 'and',
                        ['mainline', search.Operator.IS, 'T']
                        , 'and',
                        ['taxline', search.Operator.IS, 'F'],
                        "AND",
                        ["item","noneof","173"]
                    ],
                    columns: [

                        search.createColumn({name: 'custbody_ref_banc'}),
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'entity'}),
                        search.createColumn({name: 'custbody_efx_fe_formapago'}),
                        search.createColumn({name: 'custbody_efx_fe_metodopago'}),
                        search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
                        search.createColumn({name: 'location'}),
                        search.createColumn({name: "amount", label: "Amount"}),
                        search.createColumn({name: "amountremaining", label: "Amount"}),
                        search.createColumn({name: "custbody_efx_alumno", label: "Alumno"}),
                        search.createColumn({name: "custbody_mx_customer_rfc", label: "Alumno"}),
                        search.createColumn({
                            name: "trandate",
                            sort: search.Sort.ASC,
                            label: "Fecha"
                        }),
                        search.createColumn({
                            name: "custbody_ref_banc",
                            sort: search.Sort.ASC,
                            label: "Referencia Bancaria"
                        })
                    ]
                });

                var ejecutar_facturas = busqueda_facturas.run();

                var resultado_facturas = ejecutar_facturas.getRange(0, 100);


                var facturas_array = [];

                for (var i = 0; i < resultado_facturas.length; i++) {
                    var fac_internalid = resultado_facturas[i].getValue({name: 'internalid'}) || '';
                    var fac_referencia = resultado_facturas[i].getValue({name: 'custbody_ref_banc'}) || '';
                    var fac_entity = resultado_facturas[i].getValue({name: 'entity'}) || '';
                    var fac_Fpago = resultado_facturas[i].getValue({name: 'custbody_efx_fe_formapago'}) || '';
                    var fac_Mpago = resultado_facturas[i].getValue({name: 'custbody_efx_fe_metodopago'}) || '';
                    var fac_Ucfdi = resultado_facturas[i].getValue({name: 'custbody_efx_fe_usocfdi'}) || '';
                    var fac_location = resultado_facturas[i].getValue({name: 'location'}) || '';
                    var fac_amount = resultado_facturas[i].getValue({name: 'amount'}) || '';
                    var fac_date = resultado_facturas[i].getValue({name: 'trandate'}) || '';
                    var fac_amountdue = resultado_facturas[i].getValue({name: 'amountremaining'}) || '';
                    var fac_son = resultado_facturas[i].getValue({name: 'custbody_efx_alumno'}) || '';
                    var fac_rfc = resultado_facturas[i].getValue({name: 'custbody_mx_customer_rfc'}) || '';

                    facturas_array.push({
                        fac_internalid: fac_internalid,
                        fac_referencia: fac_referencia,
                        fac_entity:fac_entity,
                        fac_Fpago:fac_Fpago,
                        fac_Mpago:fac_Mpago,
                        fac_Ucfdi:fac_Ucfdi,
                        fac_location:fac_location,
                        fac_amount:fac_amount,
                        fac_date:fac_date,
                        fac_amountdue:fac_amountdue,
                        fac_son:fac_son,
                        fac_rfc: fac_rfc
                    });
                }
                return facturas_array
            }catch (e) {
                log.debug({title: '375Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerTipoDePago(linea_linea) {

            try{
                var formaDePago = 20;
                if (linea_linea.includes('TRANSF SPEI')){
                    formaDePago = 3;
                }
                if (linea_linea.includes('DEP ELE TC')){
                    formaDePago = 1;
                }
                if (linea_linea.includes('EFECT ATM')){
                    formaDePago = 1;
                }
                if (linea_linea.includes('CREDITO')){
                    formaDePago = 4;
                }
                if (linea_linea.includes('DEBITO')){
                    formaDePago = 18;
                }
                if (linea_linea.includes('DEP S B COBRO')){
                    formaDePago = 2;
                }
                return formaDePago
            }catch (e) {
                log.debug({title: '410Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }


        }

        function ObtenerTipoRfc(fac_rfc){
            try{
                var RFCstring = fac_rfc  ;
                var RFC = RFCstring[3];
                var rfc_tipo = '';

                if(isNaN(parseInt(RFC))){
                    rfc_tipo = 21
                }else{
                    rfc_tipo = 3
                }
                return rfc_tipo
            }catch (e) {
                log.debug({title: '436Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerDatosProntopago(Controlpp) {
            try{

                if(Controlpp==false){
                    var curr_month = new Date().getMonth() + 1;
                    curr_month = curr_month.toString();
                    if(curr_month.length == 1){

                        curr_month = '0'+curr_month;
                    }
                }else{
                    var curr_month = new Date().getMonth() + 1;
                    curr_month = curr_month.toString();
                    if(curr_month.length == 1){
                        curr_month = '0'+curr_month;
                    }

                }

                if(curr_month == 13){
                    curr_month = '01'
                }
                log.debug({title: 'curr_month ', details:curr_month});
                var customrecord_efx_pronto_pagoSearchObj = search.create({
                    type: "customrecord_efx_pronto_pago",
                    filters:
                        [
                            ["custrecord_efx_selec_mes.name","contains",curr_month]
                        ],
                    columns:
                        [

                            search.createColumn({name: 'custrecord_efx_pro_dias'}),
                            search.createColumn({name: "custrecord_efx_pro_porcentaje", label: "Porcentaje"}),

                        ]
                });
                var searchResultCount = customrecord_efx_pronto_pagoSearchObj.runPaged().count;
                log.debug({title: 'searchResultCount ', details:searchResultCount});
                var diaProntoPago;
                var porcpp;
                var OBJpp = [];
                customrecord_efx_pronto_pagoSearchObj.run().each(function(result){
                    diaProntoPago = result.getValue({name: 'custrecord_efx_pro_dias'});
                    porcpp = result.getValue({name: 'custrecord_efx_pro_porcentaje'});
                    OBJpp.push({Diapp :diaProntoPago, porcentaje: porcpp })
                    return true;
                });
                return OBJpp;
            }catch (e) {
                log.debug({title: '481Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }

        }

        function AgregarProntoPago(DatosProntoPago,fac_amount,fac_internalid,linea_importe,fac_amountdue,fac_date,linea_fecha_transformada,Controlpp,invoPagoCompleto) {
            try {
                if(Controlpp==false){
                    var date_fact = new Date(fac_date);

                    var mes_fact = date_fact.getMonth() + 1;

                    var date_pago = new Date(linea_fecha_transformada);

                    var mes_pago = date_pago.getMonth() + 1;

                    var dia_pago = date_pago.getDate();
                    if(mes_pago == mes_fact){
                        if(dia_pago <= DatosProntoPago[0].Diapp){
                            var porcent = DatosProntoPago[0].porcentaje;

                            var porcentString = porcent.replace('%', '')
                            var porcentNumber =parseFloat(porcentString);

                            var resta = (fac_amount * (porcentNumber/100))*(-1);

                            if(linea_importe>=(fac_amountdue)){

                                var invoiceSearchObj = search.create({
                                    type: "invoice",
                                    filters:
                                        [
                                            ["type","anyof","CustInvc"],
                                            "AND",
                                            ["internalid","anyof", fac_internalid],
                                            "AND",
                                            ['item.name','is','Descuento Anualidad']
                                        ],
                                    columns:[

                                    ]
                                });
                                var searchResultCount = invoiceSearchObj.runPaged().count;

                                if(!searchResultCount){

                                    var invoice = record.load({
                                        type: record.Type.INVOICE,
                                        id: fac_internalid,
                                        isDynamic: true
                                    });

                                    invoice.selectNewLine({sublistId: 'item'});


                                    invoice.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: 4439
                                    });
                                    invoice.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'rate',
                                        value: resta
                                    });
                                    invoice.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'description',
                                        value: 'Prontopago por valor de: '+ DatosProntoPago[0].porcentaje
                                    });

                                    invoice.commitLine('item');
                                    var id_test_inv = invoice.save();

                                    log.audit({title:'Agregado Prontopago', details: id_test_inv });
                                }
                            }
                        }
                    }
                }else{
                    var date_fact = new Date(fac_date);

                    var mes_fact = date_fact.getMonth() + 1;

                    var date_pago = new Date(linea_fecha_transformada);

                    var mes_pago = date_pago.getMonth() + 1;

                    var dia_pago = date_pago.getDate();

                    if(mes_pago == mes_fact){
                        log.debug({title: 'DatosProntoPago[0].Diapp ', details:DatosProntoPago[0].Diapp});

                        var porcent = DatosProntoPago[0].porcentaje;

                        var porcentString = porcent.replace('%', '')
                        var porcentNumber =parseFloat(porcentString);

                        var resta = (fac_amount * (porcentNumber/100))*(-1);



                        invoPagoCompleto.selectNewLine({sublistId: 'item'});


                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: 4439
                        });
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: resta
                        });
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'description',
                            value: 'Prontopago por valor de: '+ DatosProntoPago[0].porcentaje
                        });

                        invoPagoCompleto.commitLine('item');
                        log.audit({title:'Agregado Prontopago' });
                        return invoPagoCompleto;



                    }
                }


                if(!resta){
                    resta = 0
                }
                return resta;
            }catch (e) {
                log.debug({title: '574Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerInformacionCliente(Tutelado) {
            try {
                var ObjCli = [];
                var ObjCliente = record.load({type: "customer", id: Tutelado , isDynamic:false})
                var Subsidiaria = ObjCliente.getValue({fieldId: 'subsidiary'});
                var ipCampus = ObjCliente.getValue({fieldId: 'custentity_efx_ip_campus'});
                var IPREVOE = ObjCliente.getValue({fieldId: 'custentity_efx_ip_rvoealumno'});
                ObjCli.push({Subsidiaria:Subsidiaria, ipCampus:ipCampus,IPREVOE: IPREVOE })
                return ObjCli;
            }catch (e) {
                log.debug({title: '595Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerInformacionRecargos(Tutelado) {
            try {
                var ObjRec = [];
                var customrecord_tkio_registro_recargoSearchObj = search.create({
                    type: "customrecord_tkio_registro_recargo",
                    filters:
                        [
                            ["custrecord_tkio_hijo_name","anyof",Tutelado]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custrecord_tkio_cantidad_recargos", label: "Monto"}),
                            search.createColumn({name: "internalid", label: "ID interno"}),
                            search.createColumn({name: "custrecord_tkio_meses_recargo", label: "Meses"})
                        ]
                });
                var mesesGroup = [];
                var SumaMontoRecargos= 0;
                var idRecargo = [];
                var valorrecargo = [];
                customrecord_tkio_registro_recargoSearchObj.run().each(function(result){
                    SumaMontoRecargos = parseFloat(result.getValue({name: "custrecord_tkio_cantidad_recargos"})) + SumaMontoRecargos;
                    mesesGroup.push(result.getValue({name: "custrecord_tkio_meses_recargo"}));
                    idRecargo.push(result.getValue({name: "internalid"})) ;
                    valorrecargo.push(result.getValue({name: "custrecord_tkio_cantidad_recargos"}));
                    return true;
                });
                ObjRec.push({mesesGroup:mesesGroup,SumaMontoRecargos:SumaMontoRecargos,idRecargo:idRecargo,valorrecargo:valorrecargo})
                return ObjRec;
            }catch (e) {
                log.debug({title: '636Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function ObtenerInformacionSaldoFavor (Tutelado,Cliente){
            try {
                var ObjSal = [];
                var customrecord_tkio_saldo_afavor_padreSearchObj = search.create({
                    type: "customrecord_tkio_saldo_afavor_padre",
                    filters:
                        [
                            ["custrecord_tkio_saldo_hijoid","anyof",Tutelado],
                            "AND",
                            ["custrecord_tkio_saldo_afavor_clitneteid","anyof",Cliente]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custrecord_tkio_saldo_padre_monto", label: "Monto"}),
                            search.createColumn({name: "internalid", label: "ID interno"})
                        ]
                });
                var idFavor;
                var SaldoAFavor;
                customrecord_tkio_saldo_afavor_padreSearchObj.run().each(function(result){
                    idFavor = result.getValue({name: "internalid"})
                    SaldoAFavor = parseFloat(result.getValue({name: "custrecord_tkio_saldo_padre_monto"})) ;
                    return true;
                });
                ObjSal.push({idFavor:idFavor,SaldoAFavor:SaldoAFavor})
                return ObjSal;
            }catch (e) {
                log.debug({title: '674Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function PagoJusto(PagoValor,FacValor,ObjRec,Objsal,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo) {
            try {
                var SumaMontoRecargos  = 0;
                if(ObjRec[0].SumaMontoRecargos){
                    SumaMontoRecargos  = ObjRec[0].SumaMontoRecargos;
                }

                if(PagoValor == (SumaMontoRecargos + FacValor)){

                    var invoiceMOD = record.load({
                        type: "invoice", id: fac_internalid , isDynamic:false
                    })

                    invoiceMOD.setValue({fieldId:'custbody_efx_fe_formapago', value: formaDePago});

                    invoiceMOD.setValue({fieldId:'custbody_efx_fe_metodopago', value: 1});
                    invoiceMOD.setValue({fieldId:'custbody_efx_fe_complemento_educativo',value: true })
                    invoiceMOD.setValue({fieldId:'custbody_efx_fe_usocfdi',value: rfc_tipo })


                    var invoset = invoiceMOD.save()


                    var TranformJusto = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: fac_internalid,
                        toType: record.Type.CUSTOMER_PAYMENT,
                        isDynamic: false,
                    });


                    TranformJusto.setValue({
                        fieldId: 'amount',
                        value: PagoValor
                    });
                    if(Objcli[0].ipCampus != 9){
                        TranformJusto.setValue({
                            fieldId: 'account',
                            value: 720
                        });
                    }else{

                        TranformJusto.setValue({
                            fieldId: 'undepfunds',
                            value: 'T'
                        });
                    }
                    TranformJusto.setValue({
                        fieldId: 'location',
                        value: Objcli[0].ipCampus
                    });
                    TranformJusto.setValue({
                        fieldId: 'custbody_efx_alumno',
                        value: Tutelado
                    });
                    TranformJusto.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });


                    var salvadoPagoJusto = TranformJusto.save();

                    var applyJusto = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoJusto , isDynamic:false})
                    var numLinepay = applyJusto.getLineCount({sublistId: 'apply'});
                    applyJusto.setValue({fieldId:'custbody_efx_alumno',value: Tutelado});
                    applyJusto.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    applyJusto.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });
                    applyJusto.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });

                    for (var j = 0; j < numLinepay; j++){
                        if(applyJusto.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: j
                        }) == fac_internalid)
                        {
                            applyJusto.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                line:j ,
                                value: true
                            });
                            var IDpagadoJusto = applyJusto.save();

                        }
                    }

                    return fac_internalid;
                }else{

                    var ret =  PagaMenos(PagoValor,FacValor,ObjRec,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)
                    return ret;

                }

            }catch (e) {
                log.debug({title: '791Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function PagaMas(PagoValor,FacValor,ObjRec,Objsal,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)                  {
            try {

                var precioCol =  ObtenerPrecioColegiatura(fac_internalid,Tutelado);
                log.audit({title: 'precioCol', details: precioCol});
                var Descripcion = CrearDescripcion(precioCol,PagoValor,meses,linea_fecha_transformada);
                log.audit({title: 'Descripcion', details: Descripcion});
                var SumaMontoRecargos = 0;
                if(ObjRec[0].SumaMontoRecargos){
                    SumaMontoRecargos = ObjRec[0].SumaMontoRecargos;
                }

                if(PagoValor > (SumaMontoRecargos + FacValor)){

                    if(ImporteTotal==PagoValor){
                        var invoPagoCompleto =  CrearFactura(Cliente,Objcli,Tutelado,ReferenciaFactura,linea_fecha_transformada,formaDePago,rfc_tipo,PagoValor,SumaMontoRecargos,Descripcion);
                        if(invoPagoCompleto==null){
                            log.audit({title: 'invoPagoCompleto', details: invoPagoCompleto});
                        }

                        if(SumaMontoRecargos>0){
                            invoPagoCompleto = AgregarRecargos(invoPagoCompleto,ObjRec,Objcli,Tutelado)
                            if(invoPagoCompleto==null){
                                log.audit({title: 'invoPagoCompleto', details: invoPagoCompleto});
                            }
                        }

                        var salvadoInvoPagoCompleto = invoPagoCompleto.save();
                        log.audit({title: 'salvadoInvoPagoCompleto', details: salvadoInvoPagoCompleto});
                        mainFact = salvadoInvoPagoCompleto;

                        var Pago =  AplicarPago(salvadoInvoPagoCompleto,PagoValor,Objcli,Tutelado,linea_fecha_transformada)
                        if(Pago==null){
                            log.audit({title: 'Pago', details: Pago});
                        }
                        var salvadoPagoPagoCompleto = Pago.save();
                        log.audit({title: 'salvadoPagoPagoCompleto', details: salvadoPagoPagoCompleto});

                        var AplicarPagoAFactura1 = AplicarPagoAFactura(salvadoPagoPagoCompleto,ReferenciaFactura,salvadoInvoPagoCompleto,) ;

                        var IDpagadoPagoCompleto = AplicarPagoAFactura1.save();
                        log.audit({title: 'IDpagadoPagoCompleto', details: IDpagadoPagoCompleto});

                        var AplicarAfacturaOriginal1 = AplicarAfacturaOriginal(fac_internalid,FacValor,Objcli,Tutelado)
                        if(AplicarAfacturaOriginal1==null){
                            log.audit({title: 'AplicarAfacturaOriginal1', details: AplicarAfacturaOriginal1});
                        }

                        var salvadoPagoMas = AplicarAfacturaOriginal1.save();
                        log.audit({title: 'salvadoPagoMas', details: salvadoPagoMas});

                        var  AplicarAFacturaOriginalLinea1 = AplicarAFacturaOriginalLinea(salvadoPagoMas,Tutelado,ReferenciaFactura,linea_fecha_transformada,fac_internalid,FacValor)
                        if(AplicarAFacturaOriginalLinea1==null){
                            log.audit({title: 'AplicarAFacturaOriginalLinea1', details: AplicarAFacturaOriginalLinea1});
                        }

                        var IDpagadoMas = AplicarAFacturaOriginalLinea1.save();
                        log.audit({title: 'IDpagadoMas', details: IDpagadoMas});

                        var SaldoAfavor = GenerarSaldoAFavor(Objsal,ImporteTotal,FacValor,PagoValor,SumaMontoRecargos,Tutelado,Cliente)
                        if(SaldoAfavor==null){
                            log.audit({title: 'SaldoAfavor', details: SaldoAfavor});
                        }else{
                            var ActualizarSF = SaldoAfavor.save();
                            log.audit({title: 'ActualizarSF', details: ActualizarSF});
                        }



                        if(ObjRec[0].idRecargo[0]){

                            var montoFacRec = PagoValor;

                            var RecargosD =   RestarRecargos(ObjRec,montoFacRec,Tutelado)
                            if(RecargosD==null){
                                log.audit({title: 'RecargosD', details: RecargosD});
                            }
                            var AplicarRecargo =  RecargosD.save();
                            log.audit({title: 'AplicarRecargo', details: AplicarRecargo});

                        }

                        return salvadoInvoPagoCompleto;
                    }
                    else{

                        var OtraFactura =  AplicarAOtrasFacturas(fac_internalid,ImporteTotal,Objcli,Tutelado)
                        if(OtraFactura==null){
                            log.audit({title: 'OtraFactura', details: OtraFactura});
                        }
                        var salvadoPagoMas = OtraFactura.save();
                        log.audit({title: 'salvadoPagoMas', details: salvadoPagoMas})

                        var applyMas =  AplicarAOtrasFacturasPagos(fac_internalid,ImporteTotal,Tutelado,salvadoPagoMas)
                        if(applyMas==null){
                            log.audit({title: 'applyMas', details: applyMas});
                        }

                        var IDpagadoMas = applyMas.save();
                        log.audit({title: 'IDpagadoMas', details: IDpagadoMas})

                        var AplicaSFOF = AplicacionSaldoAFavorOtrasFacturas(Objsal,FacValor,ImporteTotal,Cliente,Tutelado)
                        if(AplicaSFOF==null){
                            log.audit({title: 'AplicaSFOF', details: AplicaSFOF});
                        }

                        var act = AplicaSFOF.save();
                        log.audit({title: 'act', details: act})

                        return salvadoPagoMas;

                    }

                }else if(PagoValor <( SumaMontoRecargos + FacValor)){
                    var ret =  PagaMenos(PagoValor,FacValor,ObjRec,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo)
                    return ret;
                }

            }catch (e) {
                log.debug({title: '918Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function PagaMenos(PagoValor,FacValor,ObjRec,Tutelado,Cliente,Objcli,ReferenciaFactura,meses,ImporteTotal,fac_internalid,linea_fecha_transformada,formaDePago,rfc_tipo) {
            try {

                var ClinteInfo = Objcli[0];


                var  SumaMontoRecargos = 0;
                if(ObjRec.SumaMontoRecargos){
                    SumaMontoRecargos = ObjRec[0].SumaMontoRecargos;
                }
                var montoFacTax = 0;
                if(ImporteTotal==PagoValor){
                    if(SumaMontoRecargos>0){
                        montoFacTax = (SumaMontoRecargos / 1.16)  ;
                    }

                    var invoPagoCompleto = record.create({type: record.Type.INVOICE, isDynamic:true});
                    invoPagoCompleto.setValue({fieldId:'entity',value: Cliente , ignoreFieldChange : false });
                    invoPagoCompleto.setValue({fieldId:'subsidiary',value: ClinteInfo.Subsidiaria });
                    invoPagoCompleto.setValue({fieldId:'location',value: ClinteInfo.ipCampus });
                    invoPagoCompleto.setValue({fieldId:'approvalstatus',value: 2 });
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_alumno',value: Tutelado })
                    invoPagoCompleto.setValue({fieldId:'custbody_ref_banc',value: ReferenciaFactura })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_ip_tid',value: Tutelado })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: '20' })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: '2' })
                    invoPagoCompleto.setValue({fieldId:'trandate',value: linea_fecha_transformada })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: formaDePago })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: 1 })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_complemento_educativo',value: true })
                    invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_usocfdi',value: rfc_tipo })

                    if(PagoValor>SumaMontoRecargos){
                        invoPagoCompleto.selectNewLine({sublistId : 'item'});
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId : 'item',
                            fieldId   : 'item',
                            value     : 589
                        });

                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_ip_idchild',
                            value: Tutelado,
                        });
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'description',
                            value: 'Colegiatura correspondiente a los meses de:  ',
                        });
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: PagoValor - SumaMontoRecargos,});

                        if(ClinteInfo.IPREVOE){
                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                                value: ClinteInfo.IPREVOE,
                            });
                        }
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_ip_idchild',
                            value: Tutelado,
                        });
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_ip_childprospectus',
                            value: Tutelado,
                        });
                        invoPagoCompleto.commitLine({sublistId : 'item'});
                        invoPagoCompleto.selectNewLine({sublistId : 'item'});
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId : 'item',
                            fieldId   : 'item',
                            value     : '-2'
                        });
                        invoPagoCompleto.commitLine({sublistId : 'item'});
                    }
                    if(SumaMontoRecargos>0){

                        for(var recaN = 0 ; recaN<ObjRec[0].idRecargo.length; recaN ++ ){
                            var mountFac_tax = parseFloat(ObjRec[0].valorrecargo[recaN]) / 1.16 ;

                            invoPagoCompleto.selectNewLine({sublistId : 'item'});
                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId   : 'item',
                                value     : 173
                            });
                            if(mountFac_tax<=PagoValor){
                                invoPagoCompleto.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value:  mountFac_tax ,
                                });
                            }else {
                                invoPagoCompleto.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value:  PagoValor / 1.16 ,
                                });
                            }

                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                value: 'Recargo correspondiente al mes de:  '+meses[ObjRec[0].mesesGroup[recaN]-1],
                            });

                            if(ClinteInfo.IPREVOE){
                                invoPagoCompleto.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                                    value: ClinteInfo.IPREVOE,
                                });
                            }
                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_efx_ip_idchild',
                                value: Tutelado,
                            });

                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_efx_ip_childprospectus',
                                value: Tutelado,
                            });
                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                value: '24' ,
                            });


                            invoPagoCompleto.commitLine({sublistId : 'item'});
                            invoPagoCompleto.selectNewLine({sublistId : 'item'});
                            invoPagoCompleto.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId   : 'item',
                                value     : '-2'
                            });
                            invoPagoCompleto.commitLine({sublistId : 'item'});
                        }
                    }


                    var salvadoInvoPagoCompleto = invoPagoCompleto.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    mainFact = salvadoInvoPagoCompleto;
                    var description = record.load({type: record.Type.INVOICE, id: mainFact , isDynamic:false});
                    var Fechames = linea_fecha_transformada.getMonth();
                    var DesAct = description.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: 0
                    })

                    description.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line:0 ,
                        value: DesAct + meses[Fechames]
                    });
                    description.save();

                    var TranformPagoCompleto = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: salvadoInvoPagoCompleto,
                        toType: record.Type.CUSTOMER_PAYMENT,
                        isDynamic: false,
                    });
                    TranformPagoCompleto.setValue({
                        fieldId: 'amount',
                        value: PagoValor
                    });
                    if(Objcli[0].ipCampus!= 9){
                        TranformPagoCompleto.setValue({
                            fieldId: 'account',
                            value: 720
                        });
                    }else{
                        TranformPagoCompleto.setValue({
                            fieldId: 'undepfunds',
                            value: 'T'
                        });
                    }
                    TranformPagoCompleto.setValue({
                        fieldId: 'location',
                        value: ClinteInfo.ipCampus
                    });
                    TranformPagoCompleto.setValue({
                        fieldId: 'custbody_efx_alumno',
                        value: Tutelado
                    });
                    TranformPagoCompleto.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    var salvadoPagoPagoCompleto = TranformPagoCompleto.save();

                    TranformPagoCompleto.setValue({
                        fieldId: 'payment',
                        value: PagoValor
                    });



                    var applyPagoCompleto = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoPagoCompleto , isDynamic:false})
                    var numLineCompleto = applyPagoCompleto.getLineCount({sublistId: 'apply'});
                    applyPagoCompleto.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    applyPagoCompleto.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });

                    for (var ji = 0; ji < numLineCompleto; ji++){
                        if(applyPagoCompleto.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: ji
                        }) == salvadoInvoPagoCompleto){
                            applyPagoCompleto.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                line:ji ,
                                value: PagoValor
                            });
                            applyPagoCompleto.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                line:ji ,
                                value: true
                            });
                            var IDpagadoPagoCompleto = applyPagoCompleto.save();

                        }
                    }


                    var TranforMas = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: fac_internalid,
                        toType: record.Type.CUSTOMER_PAYMENT,
                        isDynamic: false,
                    });

                    if(PagoValor>SumaMontoRecargos){
                        var monto = (PagoValor - SumaMontoRecargos).toFixed(2)
                    }else if(PagoValor<SumaMontoRecargos){
                        var monto = ( PagoValor  ).toFixed(2)
                    }


                    TranforMas.setValue({
                        fieldId: 'amount',
                        value: monto
                    });

                    TranforMas.setValue({
                        fieldId: 'account',
                        value: 1267
                    });

                    TranforMas.setValue({
                        fieldId: 'location',
                        value: ClinteInfo.ipCampus
                    });
                    TranforMas.setValue({
                        fieldId: 'custbody_efx_alumno',
                        value: Tutelado
                    });

                    TranforMas.setValue({
                        fieldId: 'payment',
                        value: monto
                    });

                    var numLinepay = TranforMas.getLineCount({sublistId: 'apply'});
                    TranforMas.setValue({fieldId:'custbody_efx_alumno',value: Tutelado});
                    TranforMas.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });
                    TranforMas.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    for (var j = 0; j < numLinepay; j++){
                        if(TranforMas.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: j
                        }) == fac_internalid)
                        {
                            TranforMas.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                line:j ,
                                value: true
                            });
                            TranforMas.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                line:j ,
                                value: monto
                            });
                            var IDpagadoMas = TranforMas.save();

                        }
                    }

                    var montoFacRec = PagoValor;
                    if(ObjRec[0].idRecargo[0]){

                        for (var ite = (ObjRec[0].idRecargo.length - 1); ite >= 0; ite--) {
                            var ActualizarRecargo = record.load({
                                type: 'customrecord_tkio_registro_recargo',
                                id: ObjRec[0].idRecargo[ite],
                                isDynamic: true
                            });
                            var recargoLinea = ActualizarRecargo.getValue({fieldId: 'custrecord_tkio_cantidad_recargos'});
                            var hijorec = ActualizarRecargo.getValue({fieldId: 'custrecord_tkio_hijo_name'});

                            if(hijorec==Tutelado){
                                if (parseFloat(recargoLinea) <= montoFacRec) {
                                    montoFacRec = montoFacRec - recargoLinea;

                                    ActualizarRecargo.setValue({
                                        fieldId: 'custrecord_tkio_cantidad_recargos',
                                        value: 0
                                    });

                                } else if (parseFloat(recargoLinea) > montoFacRec) {

                                    var recargoLinea2 = recargoLinea - montoFacRec;

                                    ActualizarRecargo.setValue({
                                        fieldId: 'custrecord_tkio_cantidad_recargos',
                                        value: recargoLinea2
                                    });
                                    montoFacRec = 0;
                                }

                                ActualizarRecargo.save();
                            }

                        }
                    }

                    return salvadoInvoPagoCompleto;
                }else{

                    var description = record.load({type: record.Type.INVOICE, id: mainFact , isDynamic:false});
                    var Fechames = linea_fecha_transformada.getMonth();
                    var DesAct = description.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: 0
                    })

                    description.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line:0 ,
                        value: DesAct + meses[Fechames]
                    });
                    description.save();

                    var TranforMas = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: fac_internalid,
                        toType: record.Type.CUSTOMER_PAYMENT,
                        isDynamic: false,
                    });


                    TranforMas.setValue({
                        fieldId: 'amount',
                        value: ImporteTotal
                    });

                    TranforMas.setValue({
                        fieldId: 'account',
                        value: 1267
                    });

                    TranforMas.setValue({
                        fieldId: 'location',
                        value: ipCampus
                    });
                    TranforMas.setValue({
                        fieldId: 'custbody_efx_alumno',
                        value: Tutelado
                    });

                    TranforMas.setValue({
                        fieldId: 'payment',
                        value: ImporteTotal
                    });


                    var numLinepay = TranforMas.getLineCount({sublistId: 'apply'});
                    TranforMas.setValue({fieldId:'custbody_efx_alumno',value: Tutelado});
                    TranforMas.setValue({
                        fieldId: 'payment',
                        value: ImporteTotal
                    });
                    TranforMas.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });
                    TranforMas.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    for (var j = 0; j < numLinepay; j++){
                        if(TranforMas.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: j
                        }) == fac_internalid)
                        {
                            TranforMas.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                line:j ,
                                value: false
                            });
                            TranforMas.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                line:j ,
                                value: ImporteTotal
                            });
                            var IDpagadoMas = TranforMas.save();

                        }
                    }


                    var applyPagoCompleto = record.load({type: record.Type.CUSTOMER_PAYMENT, id: IDpagadoMas , isDynamic:false})
                    var numLineCompleto = applyPagoCompleto.getLineCount({sublistId: 'apply'});
                    applyPagoCompleto.setValue({
                        fieldId: 'custbody_ref_banc',
                        value: ReferenciaFactura
                    });
                    applyPagoCompleto.setValue({
                        fieldId: 'trandate',
                        value: linea_fecha_transformada
                    });
                    for (var ji = 0; ji < numLineCompleto; ji++){
                        if(applyPagoCompleto.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: ji
                        }) == fac_internalid){
                            applyPagoCompleto.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                line:ji ,
                                value: true
                            });
                            var IDpagadoPagoCompleto = applyPagoCompleto.save();

                        }
                    }


                }
            }catch (e) {
                log.debug({title: '1409Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function PagosSinFactura(linea_referencia,linea_fecha_transformada,formaDePago,ImporteTotal,meses) {
            try{
                var fac_internalid;

                var Controlpp = true;
                var DatosProntoPago = ObtenerDatosProntopago(Controlpp);
                log.debug({title: 'DatosProntoPago ', details:DatosProntoPago});
                log.debug({title: 'inici o'});
                var tipoRefString = linea_referencia.charAt(0);
                log.debug({title: 'tipoRefString ', details:tipoRefString});
                var ObjClient = BusquedaAlumnoSinfactura(linea_referencia)
                log.debug({title: 'tipoRefString ', details:tipoRefString});
                var alumnoT = ObjClient.alumnoT;
                var itemT = ObjClient.itemT;
                log.debug({title: 'alumnoT ', details:alumnoT});
                log.debug({title: 'itemT ', details:itemT});
                var precioCol = ObtenerPrecioColegiatura(fac_internalid,alumnoT)
                log.debug({title: 'precioCol ', details:precioCol});
                var Descripcion  =  CrearDescripcion(precioCol,ImporteTotal,meses,linea_fecha_transformada) ;
                log.debug({title: 'Descripcion ', details:Descripcion});

                if(alumnoT){
                    var ObjClientInfo = BusquedaInfoAlumnoSinfactura(alumnoT);

                    var Temlevel = ObjClientInfo.Temlevel;
                    var TemSubs = ObjClientInfo.TemSubs;
                    var TemCampu = ObjClientInfo.TemCampu;
                    var Temprlvl = ObjClientInfo.Temprlvl;
                    var Temicurp = ObjClientInfo.Temicurp;
                    var TemHijo = ObjClientInfo.TemHijo;
                    var TemPadre = ObjClientInfo.TemPadre;
                    var TemRvoe = ObjClientInfo.TemRvoe;
                    var TemRFC = ObjClientInfo.TemRFC;


                    log.debug({title: 'TemRvoe ', details:TemRvoe});
                    var RFCstring = TemRFC  ;

                    var RFC = RFCstring[3];
                    var rfc_tipo = '';

                    if(isNaN(parseInt(RFC))){
                        rfc_tipo = 21
                    }else{
                        rfc_tipo = 3
                    }
                    log.debug({title: 'TemHijo ', details:TemHijo});
                    log.debug({title: 'TemPadre ', details:TemPadre});

                    var ObjClientSF = BusquedaSaldoAfavorSinfactura(TemHijo,TemPadre);
                    log.debug({title: 'ObjClientSF ', details:ObjClientSF})
                    if(ObjClientSF){
                        var idFavor=ObjClientSF.idFavor;
                        var SaldoAFavor=ObjClientSF.SaldoAFavor;
                        log.debug({title: 'idFavor ', details:idFavor})
                        log.debug({title: 'SaldoAFavor ', details:SaldoAFavor})
                    }


                    var invoPagoCompleto = BusquedaCrearfacturaSinfactura(TemPadre,TemSubs,TemCampu,TemHijo,linea_referencia,linea_fecha_transformada,formaDePago,rfc_tipo,itemT,ImporteTotal,tipoRefString,TemRvoe,Descripcion);

                    if(tipoRefString == 'C'){
                        var resta = AgregarProntoPago(DatosProntoPago,ImporteTotal,0,0,0,linea_fecha_transformada,linea_fecha_transformada,Controlpp,invoPagoCompleto);

                        if(resta){
                            var salvadoInvoPagoCompleto = resta.save();
                            log.debug({title: 'salvadoInvoPagoCompleto ', details:salvadoInvoPagoCompleto})
                        }else{
                            var salvadoInvoPagoCompleto = invoPagoCompleto.save();
                            log.debug({title: 'salvadoInvoPagoCompleto ', details:salvadoInvoPagoCompleto})
                        }
                    }else{
                        var salvadoInvoPagoCompleto = invoPagoCompleto.save();
                        log.debug({title: 'salvadoInvoPagoCompleto ', details:salvadoInvoPagoCompleto})
                    }

                    if(salvadoInvoPagoCompleto){
                        var TranformPagoCompleto = AplicarPagoFacturaSinfactura(salvadoInvoPagoCompleto,ImporteTotal,TemCampu,TemHijo,linea_fecha_transformada);

                        var salvadoPagoPagoCompleto = TranformPagoCompleto.save();
                        log.debug({title: 'salvadoPagoPagoCompleto ', details:salvadoPagoPagoCompleto});

                        var applyPagoCompleto =  AplicarPagoFacturaSinfacturaInt(linea_referencia,salvadoInvoPagoCompleto,salvadoPagoPagoCompleto);
                        log.debug({title: 'applyPagoCompleto ', details:applyPagoCompleto});
                        var IDpagadoPagoCompleto = applyPagoCompleto.save();
                        log.debug({title: 'IDpagadoPagoCompleto ', details:IDpagadoPagoCompleto});
                    }

                    if(tipoRefString == 'C'){

                        var AplicacionSF =  AplicarSaldoAFavorFacturaSinfactura(ImporteTotal,idFavor,TemPadre,TemHijo);
                        log.debug({title: 'AplicacionSF ', details:AplicacionSF});

                    }

                }
                return salvadoInvoPagoCompleto
            }catch (e) {

                log.debug({title: '1748Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;

            }
        }

        function ObtenerPrecioColegiatura(fac_internalid,Tutelado) {
            try{
                var valor = 0;
                if(fac_internalid){
                    var Invoice1 = record.load({type: record.Type.INVOICE, id: fac_internalid , isDynamic:false});

                    var valor = Invoice1.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: 0
                    })
                } else{
                    var precio = record.load({type: 'customer', id: Tutelado , isDynamic:false});

                    var NivelPrecio = precio.getValue({
                        fieldId: 'pricelevel',
                    })
                    var itemSearchObj = search.create({
                        type: "item",
                        filters:
                            [
                                ["pricing.pricelevel","anyof",NivelPrecio],
                                "AND",
                                ["internalid","anyof","168"]
                            ],
                        columns:
                            [
                                search.createColumn({
                                    name: "unitprice",
                                    join: "pricing",
                                    label: "Precio unitario"
                                })
                            ]
                    });

                    itemSearchObj.run().each(function(result){
                        valor = result.getValue({  name: "unitprice",join: "pricing"})
                        return true;
                    });
                }
                return valor;
            }catch (e) {
                log.debug({title: '1802Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function CrearDescripcion(precioCol,PagoValor,meses,linea_fecha_transformada) {
            try{

                var Fechames = linea_fecha_transformada.getMonth();
                if(mainFact){
                    var description = record.load({type: record.Type.INVOICE, id: mainFact , isDynamic:false});

                    var descripcionFull = description.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: 0
                    })
                }else{
                    var descripcionFull = 'Colegiatura correspondiente a los meses de: ';
                }


                var contador = 0;
                log.audit({title: 'parseFloat(precioCol)', details: parseFloat(precioCol)})
                log.audit({title: 'PagoValor', details: PagoValor})
                if(parseFloat(precioCol)<= PagoValor){
                    log.audit({title: 'Fechames', details: Fechames})
                    log.audit({title: 'meses', details: meses})
                    contador =  parseInt(PagoValor/precioCol )  ;
                    if (contador<1){
                        contador = 1
                    }
                    log.audit({title: 'contador', details: contador})
                    for (var cin = 0; cin<contador; cin++ ){
                        var mesVal = Fechames+(cin +1);

                        if(mesVal >11){
                            mesVal = mesVal - 12
                        }

                        if(descripcionFull === 'Colegiatura correspondiente a los meses de: '){
                            descripcionFull = descripcionFull +''+ meses[mesVal]
                        }else {
                            descripcionFull = descripcionFull +' ,'+ meses[mesVal]
                        }


                        log.audit({title: 'meses[mesVal]', details: meses[mesVal]})

                    }

                }
                return descripcionFull
            }catch (e) {
                log.debug({title: '1842Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return false;
            }
        }

        function CrearFactura(Cliente,Objcli,Tutelado,ReferenciaFactura,linea_fecha_transformada,formaDePago,rfc_tipo,PagoValor,SumaMontoRecargos,Descripcion) {
            try{

                var invoPagoCompleto = record.create({type: record.Type.INVOICE, isDynamic:true});
                invoPagoCompleto.setValue({fieldId:'entity',value: Cliente});
                invoPagoCompleto.setValue({fieldId:'subsidiary',value: Objcli[0].Subsidiaria });
                invoPagoCompleto.setValue({fieldId:'location',value: Objcli[0].ipCampus });
                invoPagoCompleto.setValue({fieldId:'approvalstatus',value: 2 });
                invoPagoCompleto.setValue({fieldId:'custbody_efx_alumno',value: Tutelado })
                invoPagoCompleto.setValue({fieldId:'custbody_ref_banc',value: ReferenciaFactura })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_ip_tid',value: Tutelado })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: '20' })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: '2' })
                invoPagoCompleto.setValue({fieldId:'trandate',value: linea_fecha_transformada })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: formaDePago })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: 1 })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_complemento_educativo',value: true })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_usocfdi',value: rfc_tipo })
                invoPagoCompleto.selectNewLine({sublistId : 'item'});
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId : 'item',
                    fieldId   : 'item',
                    value     : 589
                });
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_idchild',
                    value: Tutelado,
                });

                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: PagoValor - SumaMontoRecargos,});
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    value: Descripcion
                });
                if(Objcli[0].IPREVOE){
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                        value: Objcli[0].IPREVOE,
                    });
                }
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_idchild',
                    value: Tutelado,
                });
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_childprospectus',
                    value: Tutelado,
                });
                invoPagoCompleto.commitLine({sublistId : 'item'});
                invoPagoCompleto.selectNewLine({sublistId : 'item'});
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId : 'item',
                    fieldId   : 'item',
                    value     : '-2'
                });
                invoPagoCompleto.commitLine({sublistId : 'item'});

                return invoPagoCompleto
            }catch (e) {
                log.debug({title: '1920Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AgregarRecargos(invoPagoCompleto,ObjRec,Objcli,Tutelado) {
            try{


                for(var recaN = 0 ; recaN<ObjRec[0].idRecargo.length; recaN ++ ){
                    var mountFac_tax = parseFloat(ObjRec[0].valorrecargo[recaN]) / 1.16 ;

                    invoPagoCompleto.selectNewLine({sublistId : 'item'});
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId   : 'item',
                        value     : 173
                    });

                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value:  mountFac_tax ,
                    });
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: 'Recargo correspondiente al mes de:  '+meses[(ObjRec[0].mesesGroup[recaN])-1],
                    });


                    if(Objcli[0].IPREVOE){
                        invoPagoCompleto.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                            value: Objcli[0].IPREVOE,
                        });
                    }
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_idchild',
                        value: Tutelado,
                    });

                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_childprospectus',
                        value: Tutelado,
                    });
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        value: '24' ,
                    });


                    invoPagoCompleto.commitLine({sublistId : 'item'});
                    invoPagoCompleto.selectNewLine({sublistId : 'item'});
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId   : 'item',
                        value     : '-2'
                    });
                    invoPagoCompleto.commitLine({sublistId : 'item'});
                }

                return invoPagoCompleto;
            }catch (e) {
                log.debug({title: '1994Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarPago(salvadoInvoPagoCompleto,PagoValor,Objcli,Tutelado,linea_fecha_transformada) {
            try{
                var TranformPagoCompleto = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: salvadoInvoPagoCompleto,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: false,
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'amount',
                    value: PagoValor
                });

                if(Objcli[0].ipCampus != 9){
                    TranformPagoCompleto.setValue({
                        fieldId: 'account',
                        value: 720
                    });
                }else{
                    TranformPagoCompleto.setValue({
                        fieldId: 'undepfunds',
                        value: 'T'
                    });
                }
                TranformPagoCompleto.setValue({
                    fieldId: 'location',
                    value: Objcli[0].ipCampus
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'custbody_efx_alumno',
                    value: Tutelado
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'trandate',
                    value: linea_fecha_transformada
                });
                return TranformPagoCompleto;
            }catch (e) {
                log.debug({title: '2043Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarPagoAFactura(salvadoPagoPagoCompleto,ReferenciaFactura,salvadoInvoPagoCompleto,) {
            try{
                var applyPagoCompleto = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoPagoCompleto , isDynamic:false})
                var numLineCompleto = applyPagoCompleto.getLineCount({sublistId: 'apply'});
                applyPagoCompleto.setValue({
                    fieldId: 'custbody_ref_banc',
                    value: ReferenciaFactura
                });

                for (var ji = 0; ji < numLineCompleto; ji++){
                    if(applyPagoCompleto.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: ji
                    }) == salvadoInvoPagoCompleto){
                        applyPagoCompleto.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line:ji ,
                            value: true
                        });


                    }
                }

                return applyPagoCompleto

            }catch (e) {
                log.debug({title: '2083Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarAfacturaOriginal(fac_internalid,FacValor,Objcli,Tutelado) {
            try{
                var TranforMas = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: fac_internalid,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: false,
                });


                TranforMas.setValue({
                    fieldId: 'amount',
                    value: FacValor
                });

                TranforMas.setValue({
                    fieldId: 'account',
                    value: 1267
                });

                TranforMas.setValue({
                    fieldId: 'location',
                    value: Objcli[0].ipCampus
                });
                TranforMas.setValue({
                    fieldId: 'custbody_efx_alumno',
                    value: Tutelado
                });

                return TranforMas
            }catch (e) {
                log.debug({title: '2125Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarAFacturaOriginalLinea(salvadoPagoMas,Tutelado,ReferenciaFactura,linea_fecha_transformada,fac_internalid,FacValor) {
            try{
                var applyMas = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoMas , isDynamic:false})
                var numLinepay = applyMas.getLineCount({sublistId: 'apply'});
                applyMas.setValue({fieldId:'custbody_efx_alumno',value: Tutelado});
                applyMas.setValue({
                    fieldId: 'custbody_ref_banc',
                    value: ReferenciaFactura
                });
                applyMas.setValue({
                    fieldId: 'trandate',
                    value: linea_fecha_transformada
                });
                for (var j = 0; j < numLinepay; j++){
                    if(applyMas.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: j
                    }) == fac_internalid)
                    {
                        applyMas.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line:j ,
                            value: true
                        });
                        applyMas.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            line:j ,
                            value: FacValor
                        });
                    }
                }

                return applyMas
            }catch (e) {
                log.debug({title: '2173Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function GenerarSaldoAFavor(Objsal,ImporteTotal,FacValor,PagoValor,SumaMontoRecargos,Tutelado,Cliente) {
            try{
                log.audit({title: 'Objsal', details: Objsal});


                log.audit({title: 'Tutelado', details: Tutelado});
                log.audit({title: 'Cliente', details: Cliente});
                log.audit({title: 'ImporteTotal-FacValor', details: ImporteTotal-FacValor});

                if((ImporteTotal-FacValor)>0){
                    var diferencia = (PagoValor - (FacValor + SumaMontoRecargos));
                    log.audit({title: 'diferencia', details: diferencia});
                    if(Objsal[0].idFavor){

                        var ActualizarFavor2 = record.load({type: 'customrecord_tkio_saldo_afavor_padre', id: Objsal[0].idFavor , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });
                    }else{

                        var ActualizarFavor2 = record.create({type: 'customrecord_tkio_saldo_afavor_padre' , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_afavor_clitneteid',value: Cliente });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_hijoid',value: Tutelado });
                    }
                }
                return ActualizarFavor2;
            }catch (e) {
                log.debug({title: '2203Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function RestarRecargos(ObjRec,montoFacRec,Tutelado) {
            try{
                for (var ite = (ObjRec[0].idRecargo.length - 1); ite >= 0; ite--) {
                    var ActualizarRecargo = record.load({
                        type: 'customrecord_tkio_registro_recargo',
                        id: ObjRec[0].idRecargo[ite],
                        isDynamic: true
                    });
                    var recargoLinea = ActualizarRecargo.getValue({fieldId: 'custrecord_tkio_cantidad_recargos'});
                    var hijorec = ActualizarRecargo.getValue({fieldId: 'custrecord_tkio_hijo_name'});

                    if(hijorec==Tutelado){
                        if (parseFloat(recargoLinea) <= montoFacRec) {
                            montoFacRec = montoFacRec - recargoLinea;

                            ActualizarRecargo.setValue({
                                fieldId: 'custrecord_tkio_cantidad_recargos',
                                value: 0
                            });

                        } else if (parseFloat(recargoLinea) > montoFacRec) {

                            var recargoLinea2 = recargoLinea - montoFacRec;

                            ActualizarRecargo.setValue({
                                fieldId: 'custrecord_tkio_cantidad_recargos',
                                value: recargoLinea2
                            });
                            montoFacRec = 0;
                        }


                    }
                    return ActualizarRecargo;
                }
            }catch (e) {
                log.debug({title: '2250Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarAOtrasFacturas(fac_internalid,ImporteTotal,Objcli,Tutelado) {
            try{
                var TranforMas = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: fac_internalid,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: false,
                });


                TranforMas.setValue({
                    fieldId: 'amount',
                    value: ImporteTotal
                });

                TranforMas.setValue({
                    fieldId: 'account',
                    value: 1267
                });

                TranforMas.setValue({
                    fieldId: 'location',
                    value: Objcli[0].ipCampus
                });
                TranforMas.setValue({
                    fieldId: 'custbody_efx_alumno',
                    value: Tutelado
                });
                return  TranforMas
            }catch (e) {
                log.debug({title: '2291Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarAOtrasFacturasPagos(fac_internalid,ImporteTotal,Tutelado,salvadoPagoMas) {
            try{
                var applyMas = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoMas , isDynamic:false})
                var numLinepay = applyMas.getLineCount({sublistId: 'apply'});
                applyMas.setValue({fieldId:'custbody_efx_alumno',value: Tutelado});
                applyMas.setValue({
                    fieldId: 'custbody_ref_banc',
                    value: ReferenciaFactura
                });
                applyMas.setValue({
                    fieldId: 'trandate',
                    value: linea_fecha_transformada
                });
                for (var j = 0; j < numLinepay; j++){
                    if(applyMas.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: j
                    }) == fac_internalid)
                    {
                        applyMas.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line:j ,
                            value: true
                        });
                        applyMas.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            line:j ,
                            value: ImporteTotal
                        });


                    }
                }
                return applyMas

            }catch (e) {
                log.debug({title: '2341Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicacionSaldoAFavorOtrasFacturas(Objsal,FacValor,ImporteTotal,Cliente,Tutelado) {
            try {
                var diferencia = (ImporteTotal-FacValor);
                if( Objsal[0].SaldoAFavor > FacValor){


                    if(Objsal[0].idFavor){

                        var ActualizarFavor2 = record.load({type: 'customrecord_tkio_saldo_afavor_padre', id: Objsal[0].idFavor , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });



                    }else{

                        var ActualizarFavor2 = record.create({type: 'customrecord_tkio_saldo_afavor_padre' , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_afavor_clitneteid',value: Cliente });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_hijoid',value: Tutelado });


                    }

                }else{
                    if(Objsal[0].idFavor){

                        var ActualizarFavor2 = record.load({type: 'customrecord_tkio_saldo_afavor_padre', id: Objsal[0].idFavor , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });

                    }else{

                        var ActualizarFavor2 = record.create({type: 'customrecord_tkio_saldo_afavor_padre' , isDynamic:true});
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: 0 });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_afavor_clitneteid',value: Cliente });
                        ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_hijoid',value: Tutelado });


                    }
                }
                return ActualizarFavor2 ;
            }catch (e) {
                log.debug({title: '2393Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function BusquedaAlumnoSinfactura(referencia){
            try{

                var customrecord_efx_db_txt_referenciaSearchObj = search.create({
                    type: "customrecord_efx_db_txt_referencia",
                    filters:
                        [
                            ["custrecord_efx_db_ref_ref","startswith",referencia]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custrecord_efx_db_ref_customer", label: "Alumno"}),
                            search.createColumn({name: "custrecord_efx_db_ref_item", label: "Articulo"})
                        ]
                });
                var alumnoT;
                var itemT;
                customrecord_efx_db_txt_referenciaSearchObj.run().each(function(result){
                    alumnoT = result.getValue({name: "custrecord_efx_db_ref_customer"});
                    itemT = result.getValue({name: "custrecord_efx_db_ref_item"});
                    return true;
                });

                var OBJResponce = {
                    alumnoT:alumnoT,
                    itemT:itemT
                }

                return OBJResponce
            }catch (e) {
                log.debug({title: '2542Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }


        }

        function BusquedaInfoAlumnoSinfactura(alumnoT){
            try{

                var Temlevel;
                var TemSubs;
                var TemCampu;
                var Temprlvl;
                var Temicurp;
                var TemHijo;
                var TemPadre;
                var TemRvoe;
                var TemRFC;

                var customerSearchObj = search.create({
                    type: "customer",
                    filters:
                        [
                            ["internalid","anyof",alumnoT]
                        ],
                    columns:
                        [
                            search.createColumn({name: "pricelevel", label: "Nivel de precio"}),
                            search.createColumn({name: "subsidiary", label: "Subsidiaria principal"}),
                            search.createColumn({name: "custentity_efx_ip_campus", label: "IP - Campus"}),
                            search.createColumn({name: "custentity_efx_ip_ecurp", label: "IP CURP"}),
                            search.createColumn({name: "level", label: "Nivel"}),
                            search.createColumn({name: "custentity_tkio_ref_banc", label: "Referencia bancaria"}),
                            search.createColumn({name: "internalid", label: "ID interno"}),
                            search.createColumn({name: "custentity_efx_ip_rvoealumno", label: "IP RVOE"}),
                            search.createColumn({
                                name: "custentity_mx_rfc",
                                join: "topLevelParent",
                                label: "ID interno"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "topLevelParent",
                                label: "ID interno"
                            })
                        ]
                });
                customerSearchObj.run().each(function(result){
                    Temlevel = result.getValue({name: "level"});
                    TemSubs= result.getValue({name: "subsidiary"});
                    TemCampu= result.getValue({name: "custentity_efx_ip_campus"});
                    Temprlvl= result.getValue({name: "pricelevel"});
                    Temicurp= result.getValue({name: "custentity_efx_ip_ecurp"});
                    TemHijo= result.getValue({name: "internalid"});
                    TemPadre= result.getValue({name: "internalid", join: "topLevelParent"});
                    TemRFC= result.getValue({name: "custentity_mx_rfc", join: "topLevelParent"});
                    TemRvoe= result.getValue({name: "custentity_efx_ip_rvoealumno"});
                    return true;
                });

                var ObjResponce = {
                    Temlevel:Temlevel,
                    TemSubs:TemSubs,
                    TemCampu:TemCampu,
                    Temprlvl:Temprlvl,
                    Temicurp:Temicurp,
                    TemHijo:TemHijo,
                    TemPadre:TemPadre,
                    TemRFC:TemRFC,
                    TemRvoe:TemRvoe,
                }

                return ObjResponce
            }catch (e) {
                log.debug({title: '2575Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }


        }

        function BusquedaSaldoAfavorSinfactura(TemHijo,TemPadre){

            try {

                var customrecord_tkio_saldo_afavor_padreSearchObj = search.create({
                    type: "customrecord_tkio_saldo_afavor_padre",
                    filters:
                        [
                            ["custrecord_tkio_saldo_hijoid","anyof",TemHijo],
                            "AND",
                            ["custrecord_tkio_saldo_afavor_clitneteid","anyof",TemPadre]
                        ],
                    columns:
                        [
                            search.createColumn({name: "custrecord_tkio_saldo_padre_monto", label: "Monto"}),
                            search.createColumn({name: "internalid", label: "ID interno"})
                        ]
                });
                var idFavor;
                var SaldoAFavor;
                customrecord_tkio_saldo_afavor_padreSearchObj.run().each(function(result){
                    idFavor = result.getValue({name: "internalid"})
                    SaldoAFavor = parseFloat(result.getValue({name: "custrecord_tkio_saldo_padre_monto"})) ;
                    return true;
                });
                var ObjResponce = {
                    idFavor:idFavor,
                    SaldoAFavor:SaldoAFavor
                }
                return ObjResponce
            }catch (e) {
                log.debug({title: '2606Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }

        }

        function BusquedaCrearfacturaSinfactura(TemPadre,TemSubs,TemCampu,TemHijo,linea_referencia,linea_fecha_transformada,formaDePago,rfc_tipo,itemT,ImporteTotal,tipoRefString,TemRvoe,Descripcion){

            try {
                var invoPagoCompleto = record.create({type: record.Type.INVOICE, isDynamic:true});
                invoPagoCompleto.setValue({fieldId:'entity',value: TemPadre});
                invoPagoCompleto.setValue({fieldId:'subsidiary',value: TemSubs });
                invoPagoCompleto.setValue({fieldId:'location',value: TemCampu });
                invoPagoCompleto.setValue({fieldId:'approvalstatus',value: 2 });
                invoPagoCompleto.setValue({fieldId:'custbody_efx_alumno',value: TemHijo })
                invoPagoCompleto.setValue({fieldId:'custbody_ref_banc',value: linea_referencia })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_ip_tid',value: TemHijo })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: '20' })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: '2' })
                invoPagoCompleto.setValue({fieldId:'trandate',value: linea_fecha_transformada })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_formapago',value: formaDePago })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_metodopago',value: 1 })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_complemento_educativo',value: true })
                invoPagoCompleto.setValue({fieldId:'custbody_efx_fe_usocfdi',value: rfc_tipo })
                invoPagoCompleto.selectNewLine({sublistId : 'item'});

                if(itemT==168){
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId   : 'item',
                        value     : 589
                    });
                }else{
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId   : 'item',
                        value     : itemT
                    });
                }

                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_idchild',
                    value: TemHijo,
                });
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: -1 });
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: ImporteTotal });

                if(itemT!=178){
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        value: 26 });
                }else{
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        value: 24 });
                }
                var des = '';

                if(tipoRefString=='T'){
                    des = 'Talleres'
                }
                if(tipoRefString=='L'){
                    des = 'Libros'
                }
                if(tipoRefString=='U'){
                    des = 'Uniforme'
                }

                if(itemT==168){
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: Descripcion,
                    });
                }else{
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: des,
                    });
                }

                if(TemRvoe){
                    invoPagoCompleto.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                        value: TemRvoe,
                    });
                }
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_idchild',
                    value: TemHijo,
                });
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_ip_childprospectus',
                    value: TemHijo,
                });
                invoPagoCompleto.commitLine({sublistId : 'item'});
                invoPagoCompleto.selectNewLine({sublistId : 'item'});
                invoPagoCompleto.setCurrentSublistValue({
                    sublistId : 'item',
                    fieldId   : 'item',
                    value     : '-2'
                });
                invoPagoCompleto.commitLine({sublistId : 'item'});

                return invoPagoCompleto
            }catch (e) {
                log.debug({title: '2628Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }

        }

        function AplicarPagoFacturaSinfactura(salvadoInvoPagoCompleto,ImporteTotal,TemCampu,TemHijo,linea_fecha_transformada){
            try{
                var TranformPagoCompleto = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: salvadoInvoPagoCompleto,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: false,
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'amount',
                    value: ImporteTotal
                });

                if(TemCampu != 9){
                    TranformPagoCompleto.setValue({
                        fieldId: 'account',
                        value: 720
                    });
                }
                else{
                    TranformPagoCompleto.setValue({
                        fieldId: 'undepfunds',
                        value: 'T'
                    });
                }
                TranformPagoCompleto.setValue({
                    fieldId: 'location',
                    value: TemCampu
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'custbody_efx_alumno',
                    value: TemHijo
                });
                TranformPagoCompleto.setValue({
                    fieldId: 'trandate',
                    value: linea_fecha_transformada
                });
                return TranformPagoCompleto;
            }catch (e) {
                log.debug({title: '2646Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarPagoFacturaSinfacturaInt(linea_referencia,salvadoInvoPagoCompleto,salvadoPagoPagoCompleto) {
            try {
                var applyPagoCompleto = record.load({type: record.Type.CUSTOMER_PAYMENT, id: salvadoPagoPagoCompleto , isDynamic:false})
                var numLineCompleto = applyPagoCompleto.getLineCount({sublistId: 'apply'});
                applyPagoCompleto.setValue({
                    fieldId: 'custbody_ref_banc',
                    value: linea_referencia
                });
                for (var ji = 0; ji < numLineCompleto; ji++){
                    if(applyPagoCompleto.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: ji
                    }) == salvadoInvoPagoCompleto){
                        applyPagoCompleto.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line:ji ,
                            value: true
                        });
                    }
                }
                return  applyPagoCompleto
            }catch (e) {
                log.debug({title: '2683Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        function AplicarSaldoAFavorFacturaSinfactura(ImporteTotal,idFavor,TemPadre,TemHijo) {
            try {
                var diferencia = (ImporteTotal );

                if(idFavor){

                    var ActualizarFavor2 = record.load({type: 'customrecord_tkio_saldo_afavor_padre', id: idFavor , isDynamic:true});
                    var cantidadSF = ActualizarFavor2.getValue({fieldId:'custrecord_tkio_saldo_padre_monto' });
                    if(!cantidadSF){
                        cantidadSF = 0;
                    }
                    ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia + parseFloat(cantidadSF) });

                    var act = ActualizarFavor2.save();

                }else{
                    var ActualizarFavor2 = record.create({type: 'customrecord_tkio_saldo_afavor_padre' , isDynamic:true});
                    ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_padre_monto',value: diferencia });
                    ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_afavor_clitneteid',value: TemPadre });
                    ActualizarFavor2.setValue({fieldId:'custrecord_tkio_saldo_hijoid',value: TemHijo });
                    var act =ActualizarFavor2.save();

                }
                return  true
            }catch (e) {
                log.debug({title: '2683Error ', details:e});
                var datelog = new Date();
                var logsys3 = record.create({type: 'customrecord_tkio_log_system', isDynamic:true});
                logsys3.setValue({fieldId:'custrecord_tkio_origen_log',value: 1});
                logsys3.setValue({fieldId:'custrecord_tkio_txt_largo',value: e.message});
                logsys3.setValue({fieldId:'custrecord_tkio_fecha_log',value: datelog });
                logsys3.save();
                return null;
            }
        }

        return {getInputData, map, reduce, summarize}

    });