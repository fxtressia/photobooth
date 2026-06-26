import Container from "./Container";
import DesignEditor from "./DesignEditor";
import GraphicEditor from "./GraphicEditor";
import Provider from "./Provider";

export default function PhotoboothEditor() {


    return <Provider>
        <Container>
            
            <GraphicEditor />

        </Container>
    </Provider>
}